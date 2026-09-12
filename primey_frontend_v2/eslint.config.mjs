import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    settings: {
      react: { version: "19.2" }
    },
    rules: {
      "react/no-children-prop": "off",
      "react-hooks/exhaustive-deps": "off",
      "@next/next/no-img-element": "off",
      // React Compiler lint rules (react-hooks v6): advisory for now, the
      // existing demo patterns they flag predate the compiler.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/use-memo": "warn",
      "react-hooks/incompatible-library": "warn"
    }
  },
  {
    ignores: [".next/**", "node_modules/**", "out/**"]
  }
];

export default eslintConfig;
