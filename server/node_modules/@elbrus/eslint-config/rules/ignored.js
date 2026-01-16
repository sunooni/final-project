export default {
  rules: {
    // Do not need the strict mode
    'strict': 'off',

    // Flux reducers violate this rule
    'default-param-last': 'warn',

    // Prefer ++ over += 1
    'no-plusplus': 'off',
  },
};
