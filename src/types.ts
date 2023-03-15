/* eslint-disable @typescript-eslint/no-explicit-any */
import type { IsEqual } from "type-fest";
type Expect<T extends true> = T;

// TODO: test types with tsd

// https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html#API_Query_RequestSyntax
type KeyConditionExpressSyntaxError<Expression extends string> =
  `${Expression} was not proper KeyConditionExpression`;
type WrongPartitionKeyError<
  GivenKey extends string,
  ProperKey extends string
> = `${GivenKey} in expression ${ProperKey} must be the partition key`;

type ParseKeyConditionExpression<
  Expression extends string,
  ExpressionAttributevalues extends Record<string, any>,
  PartitionKey extends string
> = Expression extends `${infer PartitionKeyName} = ${infer Rest}`
  ? IsEqual<PartitionKeyName, PartitionKey> extends false
    ? WrongPartitionKeyError<PartitionKeyName, PartitionKey>
    : Rest extends `:${infer PartitionKeyVariableName} ${
        | "and"
        | "AND"} ${infer SortKeyExpression}`
    ? `check partitionKey ${PartitionKeyVariableName} and continue with sort key ${SortKeyExpression}`
    : Rest extends `:${infer PartitionKeyVariableName}`
    ? PartitionKeyVariableName extends keyof ExpressionAttributevalues
      ? "is okayyyy report something"
      : `${PartitionKeyVariableName} is not a key of ExpressionAttributevalues`
    : KeyConditionExpressSyntaxError<Expression>
  : KeyConditionExpressSyntaxError<Expression>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _tests = [
  Expect<
    IsEqual<
      ParseKeyConditionExpression<"bar=:bar", any, "foo">,
      KeyConditionExpressSyntaxError<"bar=:bar">
    >
  >,
  Expect<
    IsEqual<
      ParseKeyConditionExpression<"bar = :bar", any, "foo">,
      WrongPartitionKeyError<"bar", "foo">
    >
  >,
  Expect<
    IsEqual<ParseKeyConditionExpression<"foo = :foo", any, "foo">, "success">
  >
];
