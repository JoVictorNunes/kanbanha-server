/*
  Warnings:

  - Added the required column `index` to the `Task` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "finishedAt" DATETIME,
    "inDevelopmentAt" DATETIME,
    "inReviewAt" DATETIME,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    CONSTRAINT "Task_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("createdAt", "date", "description", "dueDate", "finishedAt", "id", "inDevelopmentAt", "inReviewAt", "status", "teamId") SELECT "createdAt", "date", "description", "dueDate", "finishedAt", "id", "inDevelopmentAt", "inReviewAt", "status", "teamId" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
