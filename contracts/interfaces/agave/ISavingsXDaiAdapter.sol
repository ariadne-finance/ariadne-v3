interface ISavingsXDaiAdapter {
    function sDAI() external returns (address);
    function wxdai() external returns (address);
    function deposit(uint256 assets, address receiver) external returns (uint256);
    function redeem(uint256 shares, address receiver) external returns (uint256);
}
