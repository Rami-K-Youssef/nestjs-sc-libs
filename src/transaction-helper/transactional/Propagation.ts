/**
 * Enumeration that represents transaction propagation behaviors for use with the see {@link Transactional} annotation
 */
export enum Propagation {
  /**
   * Support a current transaction, throw an exception if none exists.
   */
  MANDATORY = "MANDATORY",
  /**
   * Execute non-transactionally, throw an exception if a transaction exists.
   */
  NEVER = "NEVER",
  /**
   * Execute non-transactionally, suspend the current transaction if one exists.
   */
  NOT_SUPPORTED = "NOT_SUPPORTED",
  /**
   * Support a current transaction, create a new one if none exists.
   */
  REQUIRED = "REQUIRED",
  /**
   * Support a current transaction, execute non-transactionally if none exists.
   */
  SUPPORTS = "SUPPORTS",
}
