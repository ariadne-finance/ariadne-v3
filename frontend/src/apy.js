import { ref, shallowRef, computed, toValue } from 'vue';
import { formatUnits } from '@/formatters';

export const apy = ref({});
export const isApyReady = shallowRef(false);

export async function loadApy() {
  const r = await fetch('/api/apy');
  const json = await r.json();
  if (!json.success) {
    return;
  }

  isApyReady.value = true;

  for (const [ key, value ] of Object.entries(json)) {
    apy.value[key] = value;
  }
}

export const apyHr = computed(() => {
  if (!toValue(isApyReady)) {
    return '-';
  }

  return formatUnits(apy.value.apy, 18, 2, 2) + '%';
});

loadApy();
