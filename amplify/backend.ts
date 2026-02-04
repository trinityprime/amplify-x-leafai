import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { verifyCaptcha } from "./functions/verifyCaptcha";

defineBackend({
  auth,
  data,
  verifyCaptcha,
});
