export const PRISMA_ERROR_CODES = {
  UNIQUE_CONSTRAINT: "P2002",
  RECORD_NOT_FOUND: "P2025",
} as const;

export const ACKNOWLEDGEMENTS = {
  CREATED: { code: 200, message: "Created" },
  UPDATED: { code: 200, message: "Updated" },
  DELETED: { code: 200, message: "Deleted" },
} as const;
