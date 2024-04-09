<template>
  <svg viewBox="0 0 200 200">
    <radialGradient id="a10" cx=".66" fx=".66" cy=".3125" fy=".3125" gradientTransform="scale(2)">
      <stop offset="0" stop-color="currentColor" />
      <stop offset=".3" stop-color="currentColor" stop-opacity=".9" />
      <stop offset=".6" stop-color="currentColor" stop-opacity=".6" />
      <stop offset=".9" stop-color="currentColor" stop-opacity=".3" />
      <stop offset="1" stop-color="currentColor" stop-opacity="0" />
    </radialGradient>

    <circle
      transform-origin="center"
      fill="none"
      stroke="url(#a10)"
      stroke-width="25"
      stroke-linecap="square"
      stroke-dasharray="200 1000"
      stroke-dashoffset="0"
      cx="100"
      cy="100"
      r="70"
    />
    <circle transform-origin="center" fill="none" opacity=".2" stroke="currentColor" stroke-width="25" stroke-linecap="round" cx="100" cy="100" r="70" />
  </svg>
</template>
