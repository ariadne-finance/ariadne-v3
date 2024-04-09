import chai from 'chai';
import { takeSnapshot, setBalance } from '@nomicfoundation/hardhat-network-helpers';
import withinPercent from '../utils/chai-percent.js';

const ONE = 1n * 10n ** 18n;
const HUNDRED = ONE * 100n;

chai.use(withinPercent);
const expect = chai.expect;

const FLAGS_DEPOSIT_PAUSED  = 1 << 1;
const FLAGS_WITHDRAW_PAUSED = 1 << 2;

const AAVE_IPOOL_ADDRESSES_PROVIDER_ADDRESS = '0x36616cf17557639614c1cdDb356b1B83fc0B2132';

describe("Asdai", function() {
  let snapshot;

  let myAccount, secondAccount, ownerAccount;

  let sdai, wxdai;

  let asdai;
  let aavePool;
  let aaveOracle;

  let wxdaiPrice;

  before(async () => {
    [ myAccount, secondAccount, ownerAccount ] = await hre.ethers.getSigners();

    const savingsXDaiAdapter = await ethers.getContractAt('ISavingsXDaiAdapter', '0xD499b51fcFc66bd31248ef4b28d656d67E591A94');

    const Asdai = await ethers.getContractFactory('Asdai');
    // to test proxies:
    // asdai = await upgrades.deployProxy(SDD, [], { initializer: false, kind: 'uups' });

    // to test direct deployment
    asdai = await Asdai.deploy();
    asdai.address = await asdai.getAddress();

    const addressProvider = await ethers.getContractAt('IPoolAddressesProvider', AAVE_IPOOL_ADDRESSES_PROVIDER_ADDRESS);
    aavePool = await ethers.getContractAt('IPool', await addressProvider.getPool());

    const MockAaveOracle = await ethers.getContractFactory('MockAaveOracle');
    aaveOracle = await MockAaveOracle.deploy(await addressProvider.getPriceOracle());
    await aaveOracle.waitForDeployment();

    const addressProviderOwner = await (await ethers.getContractAt('OwnableUpgradeable', await addressProvider.getAddress())).owner();
    const impersonatorOwner = await ethers.getImpersonatedSigner(addressProviderOwner);
    await setBalance(await impersonatorOwner.getAddress(), ONE);
    await addressProvider.connect(impersonatorOwner).setPriceOracle(await aaveOracle.getAddress());

    await asdai.initialize();

    await asdai.setSettings(
      10n ** 18n / 100n, // minDepositAmount
      1000n * 10n ** 18n, // maxDepositAmount
      0 // flags
    );

    sdai = await ethers.getContractAt('IERC20Metadata', await savingsXDaiAdapter.sDAI());
    sdai.address = await sdai.getAddress();

    wxdai = await ethers.getContractAt('IERC20Metadata', await savingsXDaiAdapter.wxdai());
    wxdai.address = await wxdai.getAddress();

    wxdaiPrice = await aaveOracle.getAssetPrice(wxdai.address);

    await asdai.transferOwnership(ownerAccount.address);

    await wxdai.approve(asdai.address, 2n ** 256n - 1n);

    snapshot = await takeSnapshot();
  });

  afterEach("Revert snapshot after test", async () => {
    await snapshot.restore();
    snapshot = await takeSnapshot();
  });

  async function log() {
    const userData = await aavePool.getUserAccountData(asdai.address);

    console.log('                         hf', ethers.formatUnits(userData.healthFactor, 18));
    console.log('       availableBorrowsBase', userData.availableBorrowsBase);
    console.log('        totalCollateralBase', userData.totalCollateralBase);
    console.log('              totalDebtBase', userData.totalDebtBase);

    const totalBalanceBase = await asdai.totalBalanceBase();
    console.log('           totalBalanceBase', totalBalanceBase);

    const totalSupply = await asdai.totalSupply();
    const balance = await asdai.balanceOf(myAccount.address);

    console.log('                totalSupply', totalSupply);
    console.log('                    balance', balance);
  }

  it("open position then withdraw", async () => {
    await myAccount.sendTransaction({
      to: wxdai.address,
      value: HUNDRED
    });

    await asdai.deposit(HUNDRED);

    let balance = await asdai.balanceOf(myAccount.address);
    expect(balance).to.be.withinPercent(wxdaiPrice * 100n * 10n ** 10n, 1);
    expect(await asdai.totalBalanceBase()).to.be.withinPercent(wxdaiPrice * 100n, 1);

    const firstWithdraw = balance / 3n;

    await asdai.withdraw(firstWithdraw);

    expect(await asdai.balanceOf(myAccount.address)).to.be.withinPercent(wxdaiPrice * 100n / 3n * 2n * 10n ** 10n, 1);
    expect(await asdai.totalBalanceBase()).to.be.withinPercent(wxdaiPrice * 100n / 3n * 2n, 1);

    expect(await wxdai.balanceOf(myAccount.address)).to.be.withinPercent(HUNDRED / 3n, 1);

    await asdai.withdraw(await asdai.balanceOf(myAccount.address));

    expect(await asdai.balanceOf(myAccount.address)).to.be.lt(3);
    expect(await asdai.totalBalanceBase()).to.be.lt(3);

    expect(await wxdai.balanceOf(myAccount.address)).to.be.withinPercent(HUNDRED, 1);
  });

  it("sDai price up", async () => {
    await myAccount.sendTransaction({
      to: wxdai.address,
      value: HUNDRED
    });

    await asdai.deposit(HUNDRED);

    expect(await asdai.totalBalanceBase()).to.be.withinPercent(wxdaiPrice * 100n, 1);

    const sdaiPrice = await aaveOracle.getAssetPrice(sdai.address);
    await aaveOracle.setOverridePrice(sdai.address, sdaiPrice / 100n * 101n);

    expect(await asdai.totalBalanceBase()).to.be.withinPercent(wxdaiPrice * 100n, 5);
  });

  it("sDai price up then rebalance", async () => {
    await myAccount.sendTransaction({
      to: wxdai.address,
      value: HUNDRED
    });

    await asdai.deposit(HUNDRED);

    const sdaiPrice = await aaveOracle.getAssetPrice(sdai.address);
    await aaveOracle.setOverridePrice(sdai.address, sdaiPrice / 100n * 101n);

    const { availableBorrowsBase: availableBorrowsBaseBeforeRebalance } = await aavePool.getUserAccountData(asdai.address);
    await asdai.rebalance();
    const { availableBorrowsBase: availableBorrowsBaseAfterRebalance } = await aavePool.getUserAccountData(asdai.address);

    expect(await asdai.totalBalanceBase()).to.be.withinPercent(wxdaiPrice * 100n, 5);
    expect(availableBorrowsBaseAfterRebalance).to.be.lt(availableBorrowsBaseBeforeRebalance);
  });

  it("withdraw must emit events", async () => {
    await myAccount.sendTransaction({
      to: wxdai.address,
      value: HUNDRED
    });

    await asdai.deposit(HUNDRED);

    const myBalanceBefore = await asdai.balanceOf(myAccount.address);
    await asdai.withdraw(myBalanceBefore / 4n);

    function quarter(x) {
      const referenceValue = HUNDRED / 4n;
      return x >= referenceValue / 100n * 99n && x <= referenceValue / 100n * 101n;
    }

    await expect(asdai.withdraw(myBalanceBefore / 4n)).to.emit(asdai, 'PositionWithdraw')
      .withArgs(myBalanceBefore / 4n, quarter, myAccount.address);
  });

  it("deposit must emit events", async () => {
    await myAccount.sendTransaction({
      to: wxdai.address,
      value: HUNDRED
    });

    function correctWxdaiAmount(x) {
      return x >= (wxdaiPrice * 100n * 10n ** 10n / 100n * 99n) && x <= (wxdaiPrice * 100n * 10n ** 10n / 100n * 101n);
    }

    await expect(asdai.deposit(HUNDRED)).to.emit(asdai, 'PositionDeposit')
      .withArgs(HUNDRED, correctWxdaiAmount, myAccount.address);
  });

  it("transfer tokens", async () => {
    await myAccount.sendTransaction({
      to: wxdai.address,
      value: HUNDRED
    });

    await asdai.deposit(HUNDRED);

    const balance = await asdai.balanceOf(myAccount.address);
    await asdai.transfer(secondAccount.address, await asdai.balanceOf(myAccount.address));

    await expect(asdai.withdraw(balance / 2n)).to.be.revertedWithCustomError(asdai, 'AsdaiIncorrectDepositOrWithdrawalAmount');

    await asdai.connect(secondAccount).withdraw(balance);

    expect(await wxdai.balanceOf(secondAccount.address)).to.be.withinPercent(HUNDRED, 1);
  });

  it("withdraw more than balance", async () => {
    await myAccount.sendTransaction({
      to: wxdai.address,
      value: HUNDRED
    });

    await asdai.deposit(HUNDRED);

    const myBalance = await asdai.balanceOf(myAccount.address);
    await expect(asdai.withdraw(myBalance + 1n)).to.be.revertedWithCustomError(asdai, 'AsdaiIncorrectDepositOrWithdrawalAmount');
  });

  it("only owner can close position", async () => {
    await myAccount.sendTransaction({
      to: wxdai.address,
      value: HUNDRED
    });

    await asdai.deposit(HUNDRED);
    await expect(asdai.closePosition()).to.be.to.be.revertedWithCustomError(asdai, 'OwnableUnauthorizedAccount');
  });

  it("only owner can set settings and mappings", async () => {
    await expect(asdai.setSettings(
      0,
      10n ** 18n * 2n,
      0
    )).to.be.revertedWithCustomError(asdai, 'OwnableUnauthorizedAccount');
  });

  it("only owner can rescue tokens", async () => {
    await myAccount.sendTransaction({
      to: wxdai.address,
      value: HUNDRED
    });
    await wxdai.transfer(asdai.address, ONE);
    await expect(asdai.rescue(wxdai.address, myAccount.address)).to.be.revertedWithCustomError(asdai, 'OwnableUnauthorizedAccount');
  });

  it("caps are respected", async () => {
    await myAccount.sendTransaction({
      to: wxdai.address,
      value: HUNDRED * 2n
    });

    await asdai.connect(ownerAccount).setSettings(
      10n,
      HUNDRED,
      0
    );

    await expect(asdai.deposit(HUNDRED + 1n)).to.be.revertedWithCustomError(asdai, 'AsdaiIncorrectDepositOrWithdrawalAmount');
    await expect(asdai.deposit(1n)).to.be.revertedWithCustomError(asdai, 'AsdaiIncorrectDepositOrWithdrawalAmount');
  });

  it("cannot deposit when flags disabled", async () => {
    await myAccount.sendTransaction({
      to: wxdai.address,
      value: HUNDRED * 10n
    });

    await asdai.deposit(HUNDRED);

    await asdai.connect(ownerAccount).setSettings(
      0,
      HUNDRED * 10n,
      FLAGS_DEPOSIT_PAUSED
    );

    await expect(asdai.deposit(ONE)).to.be.revertedWithCustomError(asdai, 'AsdaiOperationDisabledByFlags');

    await asdai.withdraw(await asdai.balanceOf(myAccount.address)); // withdraw still allowed
  });

  it("cannot withdraw when flags disabled", async () => {
    await myAccount.sendTransaction({
      to: wxdai.address,
      value: HUNDRED * 3n
    });

    await asdai.deposit(HUNDRED);

    await asdai.connect(ownerAccount).setSettings(
      0,
      HUNDRED * 2n,
      FLAGS_WITHDRAW_PAUSED
    );

    await expect(asdai.withdraw(HUNDRED)).to.be.revertedWithCustomError(asdai, 'AsdaiOperationDisabledByFlags');

    await asdai.deposit(ONE); // deposit still allowed

  });

  it("close position with balance and emit event", async () => {
    await myAccount.sendTransaction({
      to: wxdai.address,
      value: HUNDRED
    });

    await asdai.deposit(HUNDRED);

    const aboutOneGreenback = v => v >= HUNDRED / 100n * 98n && v <= HUNDRED / 100n * 102n;

    await expect(asdai.connect(ownerAccount).closePosition()).to.emit(asdai, 'PositionClose').withArgs(aboutOneGreenback);
    expect(await wxdai.balanceOf(asdai.address)).to.be.withinPercent(ONE * 100n, 1);
  });

  it("disallow deposit after close position", async () => {
    await myAccount.sendTransaction({
      to: wxdai.address,
      value: HUNDRED * 2n
    });

    await asdai.deposit(HUNDRED);

    await asdai.connect(ownerAccount).closePosition();

    await expect(asdai.deposit(HUNDRED)).to.be.revertedWithCustomError(asdai, 'AsdaiOperationDisabledByFlags');
  });

  it("does not rebalance in case of too small percent movement", async () => {
    await myAccount.sendTransaction({
      to: wxdai.address,
      value: HUNDRED * 3n
    });

    await asdai.deposit(HUNDRED * 3n);
    await expect(asdai.rebalance()).to.be.revertedWithCustomError(asdai, 'AsdaiRebalanceNotNeccessary');

    await aaveOracle.setOverridePrice(wxdai.address, wxdaiPrice / 10000n * 9998n);
    await expect(asdai.rebalance()).to.be.revertedWithCustomError(asdai, 'AsdaiRebalanceNotNeccessary');
  });

  it("close position then withdraw", async () => {
    await myAccount.sendTransaction({
      to: wxdai.address,
      value: HUNDRED
    });

    await asdai.deposit(HUNDRED);

    await asdai.connect(ownerAccount).closePosition();

    const myBalance = await asdai.balanceOf(myAccount.address);
    await asdai.withdraw(myBalance);

    expect(await wxdai.balanceOf(asdai.address)).to.be.lt(10);
    expect(await wxdai.balanceOf(myAccount.address)).to.be.withinPercent(HUNDRED, 1);

    expect(await asdai.totalSupply()).to.be.eq(0);
    expect(await asdai.totalBalanceBase()).to.be.withinPercent(0, 1);
    // FIXME check for event
  });

  it("multiple users", async () => {
    await myAccount.sendTransaction({
      to: wxdai.address,
      value: HUNDRED
    });

    await asdai.deposit(HUNDRED);

    const myBalanceAfterDeposit = await asdai.balanceOf(myAccount.address);

    await wxdai.connect(secondAccount).approve(asdai.address, 2n ** 256n - 1n);

    await secondAccount.sendTransaction({
      to: wxdai.address,
      value: HUNDRED * 2n
    });

    await asdai.connect(secondAccount).deposit(HUNDRED * 2n);

    expect(await asdai.balanceOf(secondAccount.address)).to.be.withinPercent(wxdaiPrice * 2n * 100n * 10n ** 10n, 1);
    expect(await asdai.totalBalanceBase()).to.be.withinPercent(wxdaiPrice * 3n * 100n, 1);

    expect(await asdai.totalSupply()).to.be.withinPercent(wxdaiPrice * 3n * 100n * 10n ** 10n, 1);

    await asdai.withdraw(myBalanceAfterDeposit);

    expect(await wxdai.balanceOf(myAccount.address)).to.be.withinPercent(HUNDRED, 1);

    expect(await asdai.balanceOf(myAccount.address)).to.be.eq(0);
    expect(await asdai.balanceOf(secondAccount.address)).to.be.withinPercent(wxdaiPrice * 2n * 100n * 10n ** 10n, 1);
    expect(await asdai.totalBalanceBase()).to.be.withinPercent(wxdaiPrice * 2n * 100n, 1);
  });

  it("cannot be re-initialized", async () => {
    await expect(
      asdai.initialize()
    ).to.be.revertedWithCustomError(asdai, 'InvalidInitialization');
  });

  it("only balancer vault can call flash loan", async () => {
    const tokens = [ sdai.address ];
    const amounts = [ 1 ];
    const feeAmounts = [ 0 ];
    const userData = ethers.encodeBytes32String('');

    await expect(asdai.receiveFlashLoan(tokens, amounts, feeAmounts, userData)).to.be.revertedWithCustomError(asdai, 'AsdaiOnlyFlashloanLender');
  });
});
