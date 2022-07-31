import { InitialOptionsTsJest } from "ts-jest";

const config: InitialOptionsTsJest = {
  verbose: true,
  preset: "@shelf/jest-mongodb",
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  extensionsToTreatAsEsm: [".ts"],
  globals: {
    extensionsToTreatAsEsm: [".ts"],
    "ts-jest": {
      useESM: true,
    },
  },
  collectCoverageFrom: ["**/*.(t|j)s"],
  roots: ["<rootDir>/src/"],
};

module.exports = config;
