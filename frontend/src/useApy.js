import { shallowRef } from 'vue';

export function useApy({ }) { // eslint-disable-line no-empty-pattern
  const apy = shallowRef(4);

  const apyDetails = shallowRef([
    {
      title: 'FIXME',
      value: '4%'
    },

    {
      title: 'FIXME',
      value: 'TBA'
    }
  ]);

  return {
    apy,
    apyDetails
  };
}
