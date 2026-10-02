jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated/mock'));

jest.mock('firebase/firestore', () => {
  const Timestamp = {
    fromMillis(value: number) {
      return {
        seconds: Math.floor(value / 1000),
        nanoseconds: (value % 1000) * 1_000_000,
        toMillis: () => value,
      };
    },
  };
  return { Timestamp };
});
