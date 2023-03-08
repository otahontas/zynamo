/* eslint-disable @typescript-eslint/no-explicit-any */
import type { z } from "zod";
import { GetCommand, GetCommandInput } from "./GetCommand";

export const createCommandFactory = <Schema extends z.AnyZodObject>(
  _schema: Schema
) => {
  return {
    createGetCommand: (input: GetCommandInput) => {
      return new GetCommand<Schema>(input);
    },
  };
};
