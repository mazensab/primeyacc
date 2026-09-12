import { isFilterRule } from "@/components/ui/filters/filters-query";
import type { FilterNode, FilterRule } from "@/components/ui/filters/filters-types";

/**
 * Compiles a Filters query tree to a row predicate. Covers the whole operator
 * catalog rather than only the operators a page's fields offer, so adding a
 * field later needs no change here. `readField` maps a rule's path to the
 * value it tests, which lets one filter search several row properties at once.
 */
export function matchesFilterQuery<T>(
  row: T,
  node: FilterNode,
  readField: (row: T, path: string) => unknown
): boolean {
  if (isFilterRule(node)) {
    if (isIncomplete(node)) return true;
    return matchesRule(row, node, readField);
  }
  if (node.rules.length === 0) return true;
  return node.combinator === "and"
    ? node.rules.every((child) => matchesFilterQuery(row, child, readField))
    : node.rules.some((child) => matchesFilterQuery(row, child, readField));
}

// A rule with nothing to test yet matches everything: the table must not empty
// out while a value is still being chosen, and unchecking the last option of a
// multi-select commits an empty list, which is the absence of a constraint.
function isIncomplete(rule: FilterRule): boolean {
  if (rule.operator === "empty" || rule.operator === "not_empty") return false;
  return rule.value === undefined || (Array.isArray(rule.value) && rule.value.length === 0);
}

function matchesRule<T>(
  row: T,
  rule: FilterRule,
  readField: (row: T, path: string) => unknown
): boolean {
  const actual = readField(row, rule.path[0]);
  const value = rule.value;

  const result = (() => {
    switch (rule.operator) {
      case "contains":
        return String(actual).toLowerCase().includes(String(value).toLowerCase());
      case "not_contains":
        return !String(actual).toLowerCase().includes(String(value).toLowerCase());
      case "starts_with":
        return String(actual).toLowerCase().startsWith(String(value).toLowerCase());
      case "ends_with":
        return String(actual).toLowerCase().endsWith(String(value).toLowerCase());
      case "is":
      case "eq":
        return String(actual) === String(value);
      case "is_not":
      case "neq":
        return String(actual) !== String(value);
      case "is_any_of":
        return (value as string[] | undefined)?.includes(String(actual)) ?? true;
      case "is_none_of":
        return !((value as string[] | undefined)?.includes(String(actual)) ?? false);
      case "gt":
        return Number(actual) > Number(value);
      case "gte":
        return Number(actual) >= Number(value);
      case "lt":
        return Number(actual) < Number(value);
      case "lte":
        return Number(actual) <= Number(value);
      case "between": {
        const [from, to] = (value as number[] | undefined) ?? [];
        return Number(actual) >= Number(from) && Number(actual) <= Number(to);
      }
      case "not_between": {
        const [from, to] = (value as number[] | undefined) ?? [];
        return !(Number(actual) >= Number(from) && Number(actual) <= Number(to));
      }
      case "empty":
        return actual === undefined || actual === null || actual === "";
      case "not_empty":
        return !(actual === undefined || actual === null || actual === "");
      default:
        return true;
    }
  })();

  return rule.negated ? !result : result;
}
