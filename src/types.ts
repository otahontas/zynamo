/* eslint-disable @typescript-eslint/no-explicit-any */
type Assert<T extends true> = T;
type Equals<A, B> = A extends B ? (B extends A ? true : false) : false;
type And<A, B> = A extends true ? (B extends true ? true : false) : false;

// Typed Errors
type ValidationError = "Not valid";
type KeyConditionExpressSyntaxError<Expression extends string> =
  `${Expression} was not proper KeyConditionExpression`;

type ValidatePartitionKeyPart<
  PartitionKeyPart extends string,
  PartitionKey,
  ExpressionAttributevalues extends Record<string, any>
> = PartitionKeyPart extends `${infer PartitionKeyName} = ${infer PartitionKeyVariableName}`
  ? // Check if partition key name is correct
    PartitionKeyName extends PartitionKey
    ? // Check if variable is name is in ExpressionAttributevalues
      PartitionKeyVariableName extends keyof ExpressionAttributevalues
      ? PartitionKeyPart
      : "Partition key variable name must be in ExpressionAttributevalues"
    : "Partition key name must be correct"
  : "Invalid partition key part";

type SortKeySeparator = "=" | "<" | "<=" | ">" | ">=";

type ValidateSortKeyPart<
  SortKeyPart extends string,
  SortKey extends string,
  ExpressionAttributevalues extends Record<string, any>
> =
  // Check if we have a sort key and one variable
  SortKeyPart extends
    | `${infer SortKeyName} ${SortKeySeparator} ${infer SortKeyVariableName}`
    | `begins_with (${infer SortKeyName}, ${infer SortKeyVariableName})`
    ? // Check if sort key name is correct
      SortKeyName extends SortKey
      ? // Check if sort key variable name is in ExpressionAttributevalues
        SortKeyVariableName extends keyof ExpressionAttributevalues
        ? SortKeyPart
        : ValidationError
      : ValidationError
    : // Check if we have a sort key and two variables
    SortKeyPart extends `${infer SortKeyName} BETWEEN ${infer SortKeyVariableName1} AND ${infer SortKeyVariableName2}`
    ? // Check if sort key name is correct
      SortKeyName extends SortKey
      ? // Check if both sort variables names are in ExpressionAttributevalues
        SortKeyVariableName1 extends keyof ExpressionAttributevalues
        ? SortKeyVariableName2 extends keyof ExpressionAttributevalues
          ? SortKeyPart
          : ValidationError
        : ValidationError
      : ValidationError
    : ValidationError;

export type ValidateKeyConditionExpression<
  Expression extends string,
  PartitionKey extends string,
  ExpressionAttributevalues extends Record<string, any>,
  SortKey extends string | undefined = undefined
> =
  // Check if we have have both partition key and sort key
  Expression extends `${infer PartitionKeyPart} AND ${infer SortKeyPart}`
    ? SortKey extends string
      ? // Check if both partition key and sort key are correct TODO: how to report correct error, like that error was unsuitable sort key
        And<
          Equals<
            ValidatePartitionKeyPart<
              PartitionKeyPart,
              PartitionKey,
              ExpressionAttributevalues
            >,
            PartitionKeyPart
          >,
          Equals<
            ValidateSortKeyPart<
              SortKeyPart,
              SortKey,
              ExpressionAttributevalues
            >,
            SortKeyPart
          >
        > extends true
        ? // Return the expression if valid
          Expression
        : // Return error if invalid
          KeyConditionExpressSyntaxError<Expression>
      : "Sort key parameter must be defined if expression contains sort key"
    : // Validate if expression is the partitionkey part
    Equals<
        ValidatePartitionKeyPart<
          Expression,
          PartitionKey,
          ExpressionAttributevalues
        >,
        Expression
      > extends true
    ? // Return true expression if valid
      Expression
    : // Return error if invalid
      KeyConditionExpressSyntaxError<Expression>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _goodCases = [
  Assert<
    Equals<
      ValidateKeyConditionExpression<
        "Season = :s AND Episode = :e",
        "Season",
        { ":e": 1; ":s": 1 },
        "Episode"
      >,
      "Season = :s AND Episode = :e"
    >
  >,
  Assert<
    Equals<
      ValidateKeyConditionExpression<
        "Season = :s AND Episode < :e",
        "Season",
        { ":e": 1; ":s": 1 },
        "Episode"
      >,
      "Season = :s AND Episode < :e"
    >
  >,
  Assert<
    Equals<
      ValidateKeyConditionExpression<
        "Season = :s AND Episode <= :e",
        "Season",
        { ":e": 1; ":s": 1 },
        "Episode"
      >,
      "Season = :s AND Episode <= :e"
    >
  >,
  Assert<
    Equals<
      ValidateKeyConditionExpression<
        "Season = :s AND Episode > :e",
        "Season",
        { ":e": 1; ":s": 1 },
        "Episode"
      >,
      "Season = :s AND Episode > :e"
    >
  >,
  Assert<
    Equals<
      ValidateKeyConditionExpression<
        "Season = :s AND Episode >= :e",
        "Season",
        { ":e": 1; ":s": 1 },
        "Episode"
      >,
      "Season = :s AND Episode >= :e"
    >
  >,
  Assert<
    Equals<
      ValidateKeyConditionExpression<
        "Season = :s AND Episode BETWEEN :e1 AND :e2",
        "Season",
        { ":e1": 1; ":e2": 2; ":s": 1 },
        "Episode"
      >,
      "Season = :s AND Episode BETWEEN :e1 AND :e2"
    >
  >,
  Assert<
    Equals<
      ValidateKeyConditionExpression<
        "Season = :s AND begins_with (Episode, :e)",
        "Season",
        { ":e": 1; ":s": 1 },
        "Episode"
      >,
      "Season = :s AND begins_with (Episode, :e)"
    >
  >
];
