// SDPX-License-Identifier: MIT
pragma solidity ^0.8.23;

import { IERC20 } from "@openzeppelin/contracts/interfaces/IERC20.sol";
import { ERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { ERC1967Utils } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";

import { IPool } from "@aave/core-v3/contracts/interfaces/IPool.sol";
import { IAaveOracle } from "@aave/core-v3/contracts/interfaces/IAaveOracle.sol";
import { IPoolAddressesProvider } from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import { DataTypes } from "@aave/core-v3/contracts/protocol/libraries/types/DataTypes.sol";

import { IBalancerVault } from "./interfaces/balancer/IBalancerVault.sol";

import { ISavingsXDaiAdapter } from "./interfaces/agave/ISavingsXDaiAdapter.sol";

uint8 constant REBALANCE_ITERATIONS_MAX = 10;

uint256 constant AAVE_INTEREST_RATE_MODE_VARIABLE = 2;

uint8 constant FLASH_LOAN_MODE_DEPOSIT  = 1;
uint8 constant FLASH_LOAN_MODE_WITHDRAW = 2;
uint8 constant FLASH_LOAN_MODE_CLOSE    = 3;
uint8 constant FLASH_LOAN_MODE_RESYNC   = 4;

uint8 constant FLAGS_POSITION_CLOSED   = 1 << 0;
uint8 constant FLAGS_DEPOSIT_PAUSED    = 1 << 1;
uint8 constant FLAGS_WITHDRAW_PAUSED   = 1 << 2;

uint256 constant EXTRACT_LTV_FROM_POOL_CONFIGURATION_DATA_MASK = (1 << 16) - 1;

uint256 constant MIN_ASDAI_AMOUNT_TO_WITHDRAW = 10 ** 6; // roughly one cent

IBalancerVault constant BALANCER_VAULT = IBalancerVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8);
IPoolAddressesProvider constant AAVE_ADDRESS_PROVIDER = IPoolAddressesProvider(0x36616cf17557639614c1cdDb356b1B83fc0B2132);
ISavingsXDaiAdapter constant SAVINGS_X_DAI_ADAPTER = ISavingsXDaiAdapter(0xD499b51fcFc66bd31248ef4b28d656d67E591A94);

error AsdaiOperationDisabledByFlags();
error AsdaiOnlyFlashloanLender();
error AsdaiUnknownFlashloanMode();
error AsdaiIncorrectFlashloanTokenReceived();
error AsdaiIncorrectDepositOrWithdrawalAmount();
error AsdaiRebalanceNotNeccessary();
error AsdaiNotEnoughToBorrow();

/// @title Ariadne sDAI leveraged vault

contract Asdai is ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    /// @notice The minimum amount of wxDAI to deposit
    uint256 public minDepositAmount;

    /// @notice The maximum amount of wxDAI to deposit
    uint256 public maxDepositAmount;

    /// @notice Binary settings for the smart contract, as specified by the FLAGS_* constants
    uint8 public flags;

    uint8 private eightBitGap1; // 8 bits left here
    uint8 private eightBitGap2; // 8 bits left here
    uint8 private eightBitGap3; // 8 bits left here

    uint256[40] private __gap;

    /// @notice Emitted after a position has been fully closed and liquidated into wxDAI
    /// @param finalBalanceWxdai The final balance in wxDAI after closing the position
    event PositionClose(uint256 finalBalanceWxdai);

    /// @notice Emitted when a withdrawal takes place
    /// @param amount The AsDAI withdrawal amount requested by user
    /// @param amountWxdai The actual amnount of wxDAI that has been withdrawn to user
    /// @param user User address
    event PositionWithdraw(uint256 amount, uint256 amountWxdai, address user);

    /// @notice Emitted when a deposit takes place
    /// @param amountWxdai The actual amnount of wxDAI that has been deposited
    /// @param amount The amount of AsDAI minted
    event PositionDeposit(uint256 amountWxdai, uint256 amount, address user);

    /// @notice Actual constructor of this upgradeable contract
    function initialize()
        public
        initializer
    {
        __ERC20_init("Ariadne sDAI/WXDAI vault", "AsDAI");
        __Ownable_init(msg.sender);

        wxdai().approve(address(pool()), 2 ** 256 - 1);
        sdai().approve(address(pool()), 2 ** 256 - 1);

        wxdai().approve(address(SAVINGS_X_DAI_ADAPTER), 2 ** 256 - 1);
        sdai().approve(address(SAVINGS_X_DAI_ADAPTER), 2 ** 256 - 1);
    }

    function _authorizeUpgrade(address)
        internal
        override
        onlyOwner
    {}

    /// @notice Retrieves the contract's current implementation address
    /// @return The address of the active contract implementation
    function implementation() public view returns (address) {
        return ERC1967Utils.getImplementation();
    }

    modifier whenFlagNotSet(uint8 whatExactly) {
        if ((flags & whatExactly) == whatExactly) {
            revert AsdaiOperationDisabledByFlags();
        }
        _;
    }

    modifier onlyBalancerVault() {
        if (msg.sender != address(BALANCER_VAULT)) {
            revert AsdaiOnlyFlashloanLender();
        }
        _;
    }

    /// @notice Deposit funds into vault
    /// @param amount amount of wxDAI to deposit
    function deposit(uint256 amount)
        public
        whenFlagNotSet(FLAGS_DEPOSIT_PAUSED)
        whenFlagNotSet(FLAGS_POSITION_CLOSED)
    {
        if (amount == 0 || amount < minDepositAmount || amount > maxDepositAmount) {
            revert AsdaiIncorrectDepositOrWithdrawalAmount();
        }

        uint256 wxdaiPrice = getWxdaiPrice();
        _rebalance(wxdaiPrice, false);

        wxdai().transferFrom(msg.sender, address(this), amount);

        // any dust left after rebalance() goes to the next investor
        uint256 wxdaiAmount = wxdai().balanceOf(address(this));

        uint256 idealLtv = ltv() * 10 - 1; // just a tiny bit leeway

        uint256 idealTotalCollateral = wxdaiAmount * 100000 / (100000 - idealLtv);
        uint256 amountToFlashLoan = idealTotalCollateral - wxdaiAmount;

        uint256 totalBalanceBaseBefore = _totalBalanceBase();

        bytes memory userData = abi.encode(FLASH_LOAN_MODE_DEPOSIT, wxdaiPrice);
        _doFlashLoan(address(wxdai()), amountToFlashLoan, userData);

        uint256 totalBalanceBaseAfter = _totalBalanceBase();

        // Difference between 8 decimals for Aave base currency and 18 decimals for Asdai
        // is 10^10
        uint256 minted = totalBalanceBaseAfter * 10 ** 10;

        if (totalSupply() > 0) {
            uint256 totalBalanceAddedPercent = Math.mulDiv(totalBalanceBaseAfter, 10e18, totalBalanceBaseBefore) - 10e18;
            minted = Math.mulDiv(totalSupply(), totalBalanceAddedPercent, 10e18);
        }

        assert(minted > 0);

        _mint(msg.sender, minted);

        emit PositionDeposit(amount, minted, msg.sender);
    }

    /// @notice Withdraw from vault
    /// @param amount The amount of AsDAI to withdraw
    function withdraw(uint256 amount)
        public
        whenFlagNotSet(FLAGS_WITHDRAW_PAUSED)
    {
        if (amount < MIN_ASDAI_AMOUNT_TO_WITHDRAW || amount > balanceOf(msg.sender)) {
            revert AsdaiIncorrectDepositOrWithdrawalAmount();
        }

        if (flags & FLAGS_POSITION_CLOSED == FLAGS_POSITION_CLOSED) {
            _withdrawWhenPositionIsClosed(amount);
            return;
        }

        _withdrawWhilePositionIsOpen(amount);
    }

    /// @notice Returns the Total Value Locked (TVL) in the Vault
    /// @return The TVL represented in Aave's base currency
    function totalBalanceBase()
        public
        view
        returns (uint256)
    {
        return _totalBalanceBase();
    }

    /// @notice Rebalance the vault after sDAI interest accrual
    function rebalance()
        public
    {
        _rebalance(getWxdaiPrice(), true);
    }

    function _rebalance(uint256 wxdaiPrice, bool shouldRevertOnFirst)
        internal
    {
        uint256 availableBorrowsBase;
        uint256 availableBorrowsWxdai;

        IPool _pool = pool();

        (uint256 totalCollateralBase, , , , ,) = pool().getUserAccountData(address(this));

        uint256 minimumDustAmount = totalCollateralBase / 1000; // 0.1%
        if (minimumDustAmount < 10 ** 8) {
            minimumDustAmount = 10 ** 8; // 1 base currency unit aka $1
        }

        uint i = 0;
        for (i = 0; i < REBALANCE_ITERATIONS_MAX; i++) {
            (, , availableBorrowsBase, , ,) = _pool.getUserAccountData(address(this));
            if (availableBorrowsBase < minimumDustAmount) {
                if (i == 0 && shouldRevertOnFirst) {
                    revert AsdaiRebalanceNotNeccessary();
                }

                return;
            }

            availableBorrowsWxdai = convertBaseToWxdai(availableBorrowsBase, wxdaiPrice);

            _pool.borrow(address(wxdai()), availableBorrowsWxdai - 1, AAVE_INTEREST_RATE_MODE_VARIABLE, 0, address(this));
            SAVINGS_X_DAI_ADAPTER.deposit(wxdai().balanceOf(address(this)), address(this));
            _pool.supply(address(sdai()), sdai().balanceOf(address(this)), address(this), 0);
        }
    }

    function _withdrawWhenPositionIsClosed(uint256 amount)
        internal
    {
        uint256 percent = Math.mulDiv(amount, 10e18, totalSupply());
        assert(percent > 0);

        uint256 wxdaiReturnAmount = Math.mulDiv(wxdai().balanceOf(address(this)), percent, 10e18);

        _burn(msg.sender, amount);
        wxdai().transfer(msg.sender, wxdaiReturnAmount);

        emit PositionWithdraw(amount, wxdaiReturnAmount, msg.sender);
    }

    function _withdrawWhilePositionIsOpen(uint256 amount)
        internal
    {
        uint256 wxdaiPrice = getWxdaiPrice();
        _rebalance(wxdaiPrice, false);

        uint256 percent = Math.mulDiv(amount, 10e18, totalSupply());
        assert(percent > 0);

        _burn(msg.sender, amount);

        (, uint256 totalDebtBase, , , ,) = pool().getUserAccountData(address(this));
        uint256 repayDebtBase = Math.mulDiv(totalDebtBase, percent, 10e18);
        uint256 repayDebtWxdai = convertBaseToWxdai(repayDebtBase, wxdaiPrice);

        uint256 wxdaiDust = wxdai().balanceOf(address(this));
        assert(wxdaiDust < repayDebtWxdai);
        repayDebtWxdai -= wxdaiDust;

        bytes memory userData = abi.encode(FLASH_LOAN_MODE_WITHDRAW);
        _doFlashLoan(address(wxdai()), repayDebtWxdai, userData);

        uint256 wxdaiBalance = wxdai().balanceOf(address(this));
        wxdai().transfer(msg.sender, wxdaiBalance);

        emit PositionWithdraw(amount, wxdaiBalance, msg.sender);
    }

    function _doFlashLoan(address token, uint256 amount, bytes memory userData)
        internal
    {
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = IERC20(token);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;

        BALANCER_VAULT.flashLoan(address(this), tokens, amounts, userData);
    }

    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts, // solhint-disable-line no-unused-vars
        bytes memory userData
    )
        external
        onlyBalancerVault
    {
        if (tokens.length != 1 || tokens[0] != address(wxdai())) {
            revert AsdaiIncorrectFlashloanTokenReceived();
        }

        (uint8 mode) = abi.decode(userData, (uint8));

        if (mode == FLASH_LOAN_MODE_DEPOSIT) {
            (, uint256 wxdaiPrice) = abi.decode(userData, (uint8, uint256));

            // there is no dust: at this point all wxdai amount belongs to the investor.
            uint256 wxdaiBalance = wxdai().balanceOf(address(this));

            SAVINGS_X_DAI_ADAPTER.deposit(wxdaiBalance, address(this));

            // zero wxdai left on contract at this point

            // all sdai dust goes to common pool
            pool().supply(address(sdai()), sdai().balanceOf(address(this)), address(this), 0);
            pool().setUserUseReserveAsCollateral(address(sdai()), true);

            // zero sdai left on contract at this point

            (, , uint256 availableBorrowsBase, , ,) = pool().getUserAccountData(address(this));

            uint256 availableBorrowsWxdai = convertBaseToWxdai(availableBorrowsBase, wxdaiPrice);

            if (availableBorrowsWxdai < amounts[0]) {
                revert AsdaiNotEnoughToBorrow();
            }

            pool().borrow(address(wxdai()), amounts[0], AAVE_INTEREST_RATE_MODE_VARIABLE, 0, address(this));
            wxdai().transfer(address(BALANCER_VAULT), amounts[0]);

            // zero dust at this point because we have borrowed and returned exactly the flashloan amount

        } else if (mode == FLASH_LOAN_MODE_WITHDRAW) {
            // whatever dust was left before flashloan PLUS flashloan amounts equals the calculated debt to repay
            pool().repay(address(wxdai()), wxdai().balanceOf(address(this)), AAVE_INTEREST_RATE_MODE_VARIABLE, address(this));

            (, , uint256 availableBorrowsBase, , ,) = pool().getUserAccountData(address(this));

            uint256 toWithdrawBase = availableBorrowsBase * 10000 / ltv() - 1;

            if (toWithdrawBase == 0) {
                revert AsdaiNotEnoughToBorrow();
            }

            toWithdrawBase = toWithdrawBase - 1;

            uint256 toWithdraw = convertBaseToSdai(toWithdrawBase, oracle().getAssetPrice(address(sdai())));

            pool().withdraw(address(sdai()), toWithdraw, address(this));

            SAVINGS_X_DAI_ADAPTER.redeem(sdai().balanceOf(address(this)), address(this));

            // no sdai dust left here

            wxdai().transfer(address(BALANCER_VAULT), amounts[0]);

        } else if (mode == FLASH_LOAN_MODE_CLOSE) {
            pool().repay(address(wxdai()), 2 ** 256 - 1, AAVE_INTEREST_RATE_MODE_VARIABLE, address(this));
            pool().withdraw(address(sdai()), 2 ** 256 - 1, address(this));
            SAVINGS_X_DAI_ADAPTER.redeem(sdai().balanceOf(address(this)), address(this));

            // no sdai dust left here

            wxdai().transfer(address(BALANCER_VAULT), amounts[0]);

        } else if (mode == FLASH_LOAN_MODE_RESYNC) {
            (, uint256 wxdaiPrice) = abi.decode(userData, (uint8, uint256));

            pool().repay(address(wxdai()), 2 ** 256 - 1, AAVE_INTEREST_RATE_MODE_VARIABLE, address(this));

            uint256 wxdaiBalanceAfterRepay = wxdai().balanceOf(address(this));

            pool().withdraw(address(sdai()), 2 ** 256 - 1, address(this));
            SAVINGS_X_DAI_ADAPTER.redeem(sdai().balanceOf(address(this)), address(this));

            uint256 wxdaiBalanceToDeposit = wxdai().balanceOf(address(this)) - wxdaiBalanceAfterRepay;

            SAVINGS_X_DAI_ADAPTER.deposit(wxdaiBalanceToDeposit, address(this));

            pool().supply(address(sdai()), sdai().balanceOf(address(this)), address(this), 0);
            pool().setUserUseReserveAsCollateral(address(sdai()), true);

            uint256 wxdaiToBorrow = amounts[0] - wxdaiBalanceAfterRepay;

            (, , uint256 availableBorrowsBase, , ,) = pool().getUserAccountData(address(this));
            uint256 availableBorrowsWxdai = convertBaseToWxdai(availableBorrowsBase, wxdaiPrice);

            if (wxdaiToBorrow > availableBorrowsWxdai) {
                revert AsdaiNotEnoughToBorrow();
            }

            pool().borrow(address(wxdai()), wxdaiToBorrow, AAVE_INTEREST_RATE_MODE_VARIABLE, 0, address(this));
            wxdai().transfer(address(BALANCER_VAULT), amounts[0]);

            // zero dust at this point because we have borrowed and returned exactly the flashloan amount

        } else {
            revert AsdaiUnknownFlashloanMode();
        }
    }

    /// @notice Recover misplaced tokens.
    /// The function can only be invoked by the contract owner.
    /// @param token An address of token contractfrom which tokens will be collected
    /// @param to The recipient address where all retrieved tokens will be transferred
    function rescue(address token, address to)
        public
        onlyOwner
    {
        // note: no zero-balance assertions or protections, we assume the owner knows what are they doing
        if (token == address(0)) {
            payable(to).transfer(address(this).balance);
            return;
        }

        IERC20(token).transfer(to, IERC20(token).balanceOf(address(this)));
    }

    /// @notice Update contract's settings. Method is only available to owner.
    function setSettings(uint256 _minDepositAmount, uint256 _maxDepositAmount, uint8 _flags)
        public
        onlyOwner
    {
        minDepositAmount = _minDepositAmount;
        maxDepositAmount = _maxDepositAmount;
        flags = _flags;
    }

    /// @notice Closes the entire position, repaying all debt, withdrawing all collateral from Aave and deactivating the contract's deposits.
    /// The position is liquidated into WXDAI which is available for users to withdraw.
    /// Only accessible by the contract owner when the position hasn't been already closed.
    function closePosition()
        public
        whenFlagNotSet(FLAGS_POSITION_CLOSED)
        onlyOwner
    {
        flags = flags | FLAGS_POSITION_CLOSED;

        uint256 wxdaiPrice = getWxdaiPrice();
        _rebalance(wxdaiPrice, false);

        (, uint256 totalDebtBase, , , ,) = pool().getUserAccountData(address(this));
        uint256 repayDebtWxdai = convertBaseToWxdai(totalDebtBase, wxdaiPrice) / 100 * 103;

        bytes memory userData = abi.encode(FLASH_LOAN_MODE_CLOSE);
        _doFlashLoan(address(wxdai()), repayDebtWxdai, userData);

        emit PositionClose(wxdai().balanceOf(address(this)));
    }

    /// @notice Repays all debt, withdraws all collateral from Aave and then collateralizes the entire position again.
    /// Only accessible by the contract owner when the position hasn't been already closed.
    function resyncPosition()
        public
        whenFlagNotSet(FLAGS_POSITION_CLOSED)
        onlyOwner
    {
        uint256 wxdaiPrice = getWxdaiPrice();
        _rebalance(wxdaiPrice, false);

        (, uint256 totalDebtBase, , , ,) = pool().getUserAccountData(address(this));
        uint256 repayDebtWxdai = Math.mulDiv(convertBaseToWxdai(totalDebtBase, wxdaiPrice), 103, 100);

        bytes memory userData = abi.encode(FLASH_LOAN_MODE_RESYNC, wxdaiPrice);
        _doFlashLoan(address(wxdai()), repayDebtWxdai, userData);
    }

    function pool()
        internal
        view
        returns (IPool)
    {
        return IPool(AAVE_ADDRESS_PROVIDER.getPool());
    }

    function oracle()
        internal
        view
        returns (IAaveOracle)
    {
        return IAaveOracle(AAVE_ADDRESS_PROVIDER.getPriceOracle());
    }

    function wxdai()
        internal
        view
        returns (IERC20)
    {
        return IERC20(SAVINGS_X_DAI_ADAPTER.wxdai());
    }

    function sdai()
        internal
        view
        returns (IERC20)
    {
        return IERC20(SAVINGS_X_DAI_ADAPTER.sDAI());
    }

    function getWxdaiPrice()
        internal
        view
        returns (uint256)

    {
        return oracle().getAssetPrice(address(wxdai()));
    }

    function ltv()
        internal
        view
        returns (uint256)
    {
        DataTypes.ReserveConfigurationMap memory poolConfiguration = pool().getConfiguration(address(sdai()));
        return poolConfiguration.data & EXTRACT_LTV_FROM_POOL_CONFIGURATION_DATA_MASK;
    }

    function _totalBalanceBase()
        internal
        view
        returns (uint256)
    {
        (uint256 totalCollateralBase, uint256 totalDebtBase, , , ,) = pool().getUserAccountData(address(this));
        return totalCollateralBase - totalDebtBase;
    }

    function convertBaseToSdai(uint256 amount, uint256 sdaiPrice)
        internal
        pure
        returns (uint256)
    {
        return Math.mulDiv(amount, 10 ** 18, sdaiPrice);
    }

    // Not used. Left for posterity.
    //
    // function convertSdaiToBase(uint256 amount, uint256 sdaiPrice)
    //     internal
    //     pure
    //     returns (uint256)
    // {
    //     return Math.mulDiv(amount, sdaiPrice, 10 ** 18);
    // }

    function convertBaseToWxdai(uint256 amount, uint256 wxdaiPrice)
        internal
        pure
        returns (uint256)
    {
        return Math.mulDiv(amount, 10 ** 18, wxdaiPrice);
    }

    // Not used. Left for posterity.
    //
    // function convertWxdaiToBase(uint256 amount, uint256 wxdaiPrice)
    //     internal
    //     pure
    //     returns (uint256)
    // {
    //     return Math.mulDiv(amount, wxdaiPrice, 10 ** 18);
    // }
}
