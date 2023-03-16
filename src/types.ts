/* eslint-disable @typescript-eslint/no-explicit-any */
type Assert<T extends true> = T;
type Equals<A, B> = A extends B ? (B extends A ? true : false) : false;

// Typed Errors
type ParseErrorTag = "Parsing Error:";
type CreateParseError<Content extends string> = `${ParseErrorTag} ${Content}`;

type KeyConditionExpressSyntaxError<Expression extends string> =
  `${Expression} was not proper KeyConditionExpression`;

type ValidatePartitionKeyPart<
  PartitionKeyPart extends string,
  PartitionKey extends string,
  ExpressionAttributevalues extends Record<string, any>
> = PartitionKeyPart extends `${infer PartitionKeyName} = ${infer PartitionKeyVariableName}`
  ? // Check if partition key name is correct
    PartitionKeyName extends PartitionKey
    ? // Check if variable is name is in ExpressionAttributevalues
      PartitionKeyVariableName extends keyof ExpressionAttributevalues
      ? PartitionKeyPart
      : CreateParseError<`Partition key variable ${PartitionKeyVariableName} was not in ExpressionAttributevalues`>
    : CreateParseError<`Partition key in expression should be ${PartitionKey}, but it was ${PartitionKeyName}`>
  : CreateParseError<`Partition key part '${PartitionKeyPart}' of expression was not properly formatted`>;

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
        : CreateParseError<`Sort key variable ${SortKeyVariableName} was not in ExpressionAttributevalues`>
      : CreateParseError<`Sort key in expression should be ${SortKey}, but it was ${SortKeyName}`>
    : // Check if we have a sort key and two variables
    SortKeyPart extends `${infer SortKeyName} BETWEEN ${infer SortKeyVariableName1} AND ${infer SortKeyVariableName2}`
    ? // Check if sort key name is correct
      SortKeyName extends SortKey
      ? // Check if both sort variables names are in ExpressionAttributevalues
        SortKeyVariableName1 extends keyof ExpressionAttributevalues
        ? SortKeyVariableName2 extends keyof ExpressionAttributevalues
          ? SortKeyPart
          : CreateParseError<`First sort key variable ${SortKeyVariableName1} was not in ExpressionAttributevalues`>
        : CreateParseError<`Second sort key variable ${SortKeyVariableName2} was not in ExpressionAttributevalues`>
      : CreateParseError<`Sort key in expression should be ${SortKey}, but it was ${SortKeyName}`>
    : CreateParseError<`Sort key part '${SortKeyPart}' of expression was not properly formatted`>;

export type ValidateKeyConditionExpression<
  Expression extends string,
  PartitionKey extends string,
  ExpressionAttributevalues extends Record<string, any>,
  SortKey extends string | undefined = undefined
> =
  // Check if we have have both partition key and sort key
  Expression extends `${infer PartitionKeyPart} AND ${infer SortKeyPart}`
    ? SortKey extends string
      ? // Check if both partition key and sort key are correct
        ValidatePartitionKeyPart<
          PartitionKeyPart,
          PartitionKey,
          ExpressionAttributevalues
        > extends infer PartitionKeyValidationResult
        ? PartitionKeyValidationResult extends `${ParseErrorTag}${string}`
          ? // Not valid partition key, return error
            PartitionKeyValidationResult
          : ValidateSortKeyPart<
              SortKeyPart,
              SortKey,
              ExpressionAttributevalues
            > extends infer SortKeyValidationResult
          ? SortKeyValidationResult extends `${ParseErrorTag}${string}`
            ? // Not valid sort key, return error
              SortKeyValidationResult
            : // All okay, return expression
              Expression
          : never
        : never
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
