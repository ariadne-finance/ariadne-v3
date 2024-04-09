interface ISavingsXDaiAdapter {
    function sDAI() view external returns (address);
    function wxdai() view external returns (address);
    function deposit(uint256 assets, address receiver) external returns (uint256);
    function redeem(uint256 shares, address receiver) external returns (uint256);
    function vaultAPY() external view returns (uint256);
}
