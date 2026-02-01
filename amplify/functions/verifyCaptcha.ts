import { defineFunction } from "@aws-amplify/backend";

export const verifyCaptcha = defineFunction({
  name: "verifyCaptcha",
  entry: "./verifyCaptcha.handler.ts",
});
