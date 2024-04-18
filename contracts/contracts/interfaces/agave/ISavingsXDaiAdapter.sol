interface ISavingsXDaiAdapter {
    function sDAI() external view returns (address);
    function wxdai() external view returns (address);
    function deposit(uint256 assets, address receiver) external returns (uint256);
    function redeem(uint256 shares, address receiver) external returns (uint256);
    function vaultAPY() external view returns (uint256);
}
