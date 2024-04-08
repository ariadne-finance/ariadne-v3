import chai from 'chai';
import { takeSnapshot, setBalance } from '@nomicfoundation/hardhat-network-helpers';
import withinPercent from '../utils/chai-percent.js';

const ONE = 1n * 10n ** 18n;
const HUNDRED = ONE * 100n;

chai.use(withinPercent);
const expect = chai.expect;

const FLAGS_DEPOSIT_PAUSED  = 1 << 1;
const FLAGS_WITHDRAW_PAUSED = 1 << 2;

describe("SDD", function() {
  let snapshot, initialSnapshot;

  let myAccount, secondAccount, ownerAccount, liquidatorAccount;

  let sdai, wxdai;

  let sdd;
  let aavePool;
  let aaveOracle;

  let wxdaiPrice;
  let sdaiPrice;

  before(async () => {
    initialSnapshot = await takeSnapshot();

    [ myAccount, secondAccount, ownerAccount, liquidatorAccount ] = await hre.ethers.getSigners();

    const SDD = await ethers.getContractFactory('SDD');
    // to test proxies:
    // sdd = await upgrades.deployProxy(SDD, [], { initializer: false, kind: 'uups' });

    // to test direct deployment
    sdd = await SDD.deploy();

    let addressProvider;

    addressProvider = await ethers.getContractAt('IPoolAddressesProvider', '0x36616cf17557639614c1cdDb356b1B83fc0B2132');
    aavePool = await ethers.getContractAt('IPool', await addressProvider.getPool());

    const MockAaveOracle = await ethers.getContractFactory('MockAaveOracle');
    aaveOracle = await MockAaveOracle.deploy(await addressProvider.getPriceOracle());
    await aaveOracle.waitForDeployment();

    const addressProviderOwner = await (await ethers.getContractAt('OwnableUpgradeable', await addressProvider.getAddress())).owner();
    const impersonatorOwner = await ethers.getImpersonatedSigner(addressProviderOwner);
    await setBalance(await impersonatorOwner.getAddress(), ONE);
    await addressProvider.connect(impersonatorOwner).setPriceOracle(await aaveOracle.getAddress());

    await sdd.initialize();

    await sdd.setSettings(
      10n ** 18n / 100n, // minDepositAmount
      1000n * 10n ** 18n, // maxDepositAmount
      0 // flags
    );

    sdai = await ethers.getContractAt('IERC20Metadata', await sdd.sdai());
    sdai.address = await sdai.getAddress();

    wxdai = await ethers.getContractAt('IERC20Metadata', await sdd.wxdai());
    wxdai.address = await wxdai.getAddress();

    wxdaiPrice = await aaveOracle.getAssetPrice(await wxdai.getAddress());
    sdaiPrice = await aaveOracle.getAssetPrice(await sdai.getAddress());

    await sdd.transferOwnership(ownerAccount.address);

    await wxdai.approve(await sdd.getAddress(), 2n ** 256n - 1n);

    snapshot = await takeSnapshot();
  });

  after(async () => initialSnapshot.restore());

  afterEach("Revert snapshot after test", async () => {
    await snapshot.restore();
    snapshot = await takeSnapshot();
  });

  async function log() {
    const address = await sdd.getAddress();

    const userData = await aavePool.getUserAccountData(address);

    console.log('                         hf', ethers.formatUnits(userData.healthFactor, 18));
    console.log('       availableBorrowsBase', userData.availableBorrowsBase);
    console.log('        totalCollateralBase', userData.totalCollateralBase);
    console.log('              totalDebtBase', userData.totalDebtBase);

    const totalBalanceBase = await sdd.totalBalanceBase();
    console.log('           totalBalanceBase', totalBalanceBase);

    const totalSupply = await sdd.totalSupply();
    const balance = await sdd.balanceOf(myAccount.address);

    console.log('                totalSupply', totalSupply);
    console.log('                    balance', balance);
  }

  it("open position then withdraw", async () => {
    await myAccount.sendTransaction({
      to: await wxdai.getAddress(),
      value: HUNDRED
    });

    await sdd.deposit(HUNDRED);

    let balance = await sdd.balanceOf(myAccount.address);
    expect(balance).to.be.withinPercent(wxdaiPrice * 100n, 1);
    expect(await sdd.totalBalanceBase()).to.be.withinPercent(wxdaiPrice * 100n, 1);

    const firstWithdraw = balance / 3n;

    await sdd.withdraw(firstWithdraw);

    expect(await sdd.balanceOf(myAccount.address)).to.be.withinPercent(wxdaiPrice * 100n / 3n * 2n, 1);
    expect(await sdd.totalBalanceBase()).to.be.withinPercent(wxdaiPrice * 100n / 3n * 2n, 1);

    expect(await wxdai.balanceOf(myAccount.address)).to.be.withinPercent(HUNDRED / 3n, 1);

    await sdd.withdraw(await sdd.balanceOf(myAccount.address));

    expect(await sdd.balanceOf(myAccount.address)).to.be.lt(3);
    expect(await sdd.totalBalanceBase()).to.be.lt(3);

    expect(await wxdai.balanceOf(myAccount.address)).to.be.withinPercent(HUNDRED, 1);
  });

  it("sDai price up", async () => {
    await myAccount.sendTransaction({
      to: await wxdai.getAddress(),
      value: HUNDRED
    });

    await sdd.deposit(HUNDRED);

    expect(await sdd.totalBalanceBase()).to.be.withinPercent(wxdaiPrice * 100n, 1);

    await aaveOracle.setOverridePrice(await sdai.getAddress(), sdaiPrice / 100n * 101n);

    expect(await sdd.totalBalanceBase()).to.be.withinPercent(wxdaiPrice * 100n, 5);
  });

  it("sDai price up then rebalance", async () => {
    await myAccount.sendTransaction({
      to: await wxdai.getAddress(),
      value: HUNDRED
    });

    await sdd.deposit(HUNDRED);

    await aaveOracle.setOverridePrice(await sdai.getAddress(), sdaiPrice / 100n * 101n);

    const { availableBorrowsBase: availableBorrowsBaseBeforeRebalance } = await aavePool.getUserAccountData(await sdd.getAddress());
    await sdd.rebalance();
    const { availableBorrowsBase: availableBorrowsBaseAfterRebalance } = await aavePool.getUserAccountData(await sdd.getAddress());

    expect(await sdd.totalBalanceBase()).to.be.withinPercent(wxdaiPrice * 100n, 5);
    expect(availableBorrowsBaseAfterRebalance).to.be.lt(availableBorrowsBaseBeforeRebalance);
  });

  it("withdraw must emit events", async () => {
    await myAccount.sendTransaction({
      to: await wxdai.getAddress(),
      value: HUNDRED
    });

    await sdd.deposit(HUNDRED);

    const myBalanceBefore = await sdd.balanceOf(myAccount.address);
    await sdd.withdraw(myBalanceBefore / 4n);

    function quarter(x) {
      const referenceValue = HUNDRED / 4n;
      return x >= referenceValue / 100n * 99n && x <= referenceValue / 100n * 101n;
    }

    await expect(sdd.withdraw(myBalanceBefore / 4n)).to.emit(sdd, 'PositionWithdraw')
      .withArgs(myBalanceBefore / 4n, quarter, myAccount.address);
  });

  it("deposit must emit events", async () => {
    await myAccount.sendTransaction({
      to: await wxdai.getAddress(),
      value: HUNDRED
    });

    function correctWxdaiAmount(x) {
      return x >= (wxdaiPrice * 100n / 100n * 99n) && x <= (wxdaiPrice * 100n / 100n * 101n);
    }

    await expect(sdd.deposit(HUNDRED)).to.emit(sdd, 'PositionDeposit')
      .withArgs(HUNDRED, correctWxdaiAmount, myAccount.address);
  });

  it("transfer tokens", async () => {
    await myAccount.sendTransaction({
      to: await wxdai.getAddress(),
      value: HUNDRED
    });

    await sdd.deposit(HUNDRED);

    const balance = await sdd.balanceOf(myAccount.address);
    await sdd.transfer(secondAccount.address, await sdd.balanceOf(myAccount.address));

    await expect(sdd.withdraw(balance / 2n)).to.be.revertedWithCustomError(sdd, "DNDIncorrectDepositOrWithdrawalAmount");

    await sdd.connect(secondAccount).withdraw(balance);

    expect(await wxdai.balanceOf(secondAccount.address)).to.be.withinPercent(HUNDRED, 1);
  });

  it("withdraw more than balance", async () => {
    await myAccount.sendTransaction({
      to: await wxdai.getAddress(),
      value: HUNDRED
    });

    await sdd.deposit(HUNDRED);

    const myBalance = await sdd.balanceOf(myAccount.address);
    await expect(sdd.withdraw(myBalance + 1n)).to.be.revertedWithCustomError(sdd, "DNDIncorrectDepositOrWithdrawalAmount");
  });

  it("only owner can close position", async () => {
    await myAccount.sendTransaction({
      to: await wxdai.getAddress(),
      value: HUNDRED
    });

    await sdd.deposit(HUNDRED);
    await expect(sdd.closePosition()).to.be.to.be.revertedWithCustomError(sdd, "OwnableUnauthorizedAccount");
  });

  it("only owner can set settings and mappings", async () => {
    await expect(sdd.setSettings(
      0,
      10n ** 18n * 2n,
      0
    )).to.be.revertedWithCustomError(sdd, "OwnableUnauthorizedAccount");
  });

  it("only owner can rescue tokens", async () => {
    await myAccount.sendTransaction({
      to: await wxdai.getAddress(),
      value: HUNDRED
    });
    await wxdai.transfer(await sdd.getAddress(), ONE);
    await expect(sdd.rescue(await wxdai.getAddress(), myAccount.address)).to.be.revertedWithCustomError(sdd, "OwnableUnauthorizedAccount");
  });

  it("caps are respected", async () => {
    await myAccount.sendTransaction({
      to: await wxdai.getAddress(),
      value: HUNDRED * 2n
    });

    await sdd.connect(ownerAccount).setSettings(
      10n,
      HUNDRED,
      0
    );

    await expect(sdd.deposit(HUNDRED + 1n)).to.be.revertedWithCustomError(sdd, "DNDIncorrectDepositOrWithdrawalAmount");
    await expect(sdd.deposit(1n)).to.be.revertedWithCustomError(sdd, "DNDIncorrectDepositOrWithdrawalAmount");
  });

  it("cannot deposit when flags disabled", async () => {
    await myAccount.sendTransaction({
      to: await wxdai.getAddress(),
      value: HUNDRED * 10n
    });

    await sdd.deposit(HUNDRED);

    await sdd.connect(ownerAccount).setSettings(
      0,
      HUNDRED * 10n,
      FLAGS_DEPOSIT_PAUSED
    );

    await expect(sdd.deposit(ONE)).to.be.revertedWithCustomError(sdd, 'DNDOperationDisabledByFlags');

    await sdd.withdraw(await sdd.balanceOf(myAccount.address)); // withdraw still allowed
  });

  it("cannot withdraw when flags disabled", async () => {
    await myAccount.sendTransaction({
      to: await wxdai.getAddress(),
      value: HUNDRED * 3n
    });

    await sdd.deposit(HUNDRED);

    await sdd.connect(ownerAccount).setSettings(
      0,
      HUNDRED * 2n,
      FLAGS_WITHDRAW_PAUSED
    );

    await expect(sdd.withdraw(HUNDRED)).to.be.revertedWithCustomError(sdd, "DNDOperationDisabledByFlags");

    await sdd.deposit(ONE); // deposit still allowed

  });

  it("close position with balance and emit event", async () => {
    await myAccount.sendTransaction({
      to: await wxdai.getAddress(),
      value: HUNDRED
    });

    await sdd.deposit(HUNDRED);

    const aboutOneGreenback = v => v >= HUNDRED / 100n * 98n && v <= HUNDRED / 100n * 102n;

    await expect(sdd.connect(ownerAccount).closePosition()).to.emit(sdd, 'PositionClose').withArgs(aboutOneGreenback);
    expect(await wxdai.balanceOf(await sdd.getAddress())).to.be.withinPercent(ONE* 100n, 1);
  });

  it("disallow deposit after close position", async () => {
    await myAccount.sendTransaction({
      to: await wxdai.getAddress(),
      value: HUNDRED * 2n
    });

    await sdd.deposit(HUNDRED);

    await sdd.connect(ownerAccount).closePosition();

    await expect(sdd.deposit(HUNDRED)).to.be.revertedWithCustomError(sdd, "DNDOperationDisabledByFlags");
  });

  it("does not rebalance in case of too small percent movement", async () => {
    await myAccount.sendTransaction({
      to: await wxdai.getAddress(),
      value: HUNDRED * 3n
    });

    await sdd.deposit(HUNDRED * 3n);
    await expect(sdd.rebalance()).to.be.revertedWithCustomError(sdd, "DNDRebalanceNotNeccessary");

    await aaveOracle.setOverridePrice(await wxdai.getAddress(), wxdaiPrice / 10000n * 9998n);
    await expect(sdd.rebalance()).to.be.revertedWithCustomError(sdd, "DNDRebalanceNotNeccessary");
  });

  it("close position then withdraw", async () => {
    await myAccount.sendTransaction({
      to: await wxdai.getAddress(),
      value: HUNDRED
    });

    await sdd.deposit(HUNDRED);

    await sdd.connect(ownerAccount).closePosition();

    const myBalance = await sdd.balanceOf(myAccount.address);
    await sdd.withdraw(myBalance);

    expect(await wxdai.balanceOf(await sdd.getAddress())).to.be.lt(10);
    expect(await wxdai.balanceOf(myAccount.address)).to.be.withinPercent(HUNDRED, 1);

    expect(await sdd.totalSupply()).to.be.eq(0);
    expect(await sdd.totalBalanceBase()).to.be.withinPercent(0, 1);
  });

  it("multiple users", async () => {
    await myAccount.sendTransaction({
      to: await wxdai.getAddress(),
      value: HUNDRED
    });

    await sdd.deposit(HUNDRED);

    await wxdai.connect(secondAccount).approve(await sdd.getAddress(), 2n ** 256n - 1n);

    await secondAccount.sendTransaction({
      to: await wxdai.getAddress(),
      value: HUNDRED * 2n
    });

    await sdd.connect(secondAccount).deposit(HUNDRED * 2n);

    const myBalanceAfterDeposit = await sdd.balanceOf(myAccount.address);

    expect(myBalanceAfterDeposit).to.be.withinPercent(wxdaiPrice * 100n, 1);
    expect(await sdd.balanceOf(secondAccount.address)).to.be.withinPercent(wxdaiPrice * 2n * 100n, 1);
    expect(await sdd.totalBalanceBase()).to.be.withinPercent(wxdaiPrice * 3n * 100n, 1);

    expect(await sdd.totalSupply()).to.be.withinPercent(wxdaiPrice * 3n * 100n, 1);

    await sdd.withdraw(myBalanceAfterDeposit);

    expect(await wxdai.balanceOf(myAccount.address)).to.be.withinPercent(HUNDRED, 1);

    expect(await sdd.balanceOf(myAccount.address)).to.be.eq(0);
    expect(await sdd.balanceOf(secondAccount.address)).to.be.withinPercent(wxdaiPrice * 2n * 100n, 1);
    expect(await sdd.totalBalanceBase()).to.be.withinPercent(wxdaiPrice * 2n * 100n, 1);
  });

  it("cannot be re-initialized", async () => {
    await expect(
      sdd.initialize()
    ).to.be.revertedWithCustomError(sdd, 'InvalidInitialization');
  });

  it("only balancer vault can call flash loan", async () => {
    const tokens = [ await sdai.getAddress() ];
    const amounts = [ 1 ];
    const feeAmounts = [ 0 ];
    const userData = ethers.encodeBytes32String('');

    await expect(sdd.receiveFlashLoan(tokens, amounts, feeAmounts, userData)).to.be.revertedWithCustomError(sdd, 'DNDOnlyFlashloanLender');
  });
});
