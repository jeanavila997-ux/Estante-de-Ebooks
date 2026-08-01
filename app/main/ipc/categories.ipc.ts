import { IpcMain } from "electron";
import { authenticate } from "./auth-context";
import * as categories from "../services/categories.service";
import type { CategoryInput } from "../../shared/types";

export function registerCategoriesIpc(ipc: IpcMain) {
  ipc.handle("categories:list", async (_evt, token: string) =>
    categories.listCategories(authenticate(token))
  );

  ipc.handle("categories:create", async (_evt, token: string, input: CategoryInput) =>
    categories.createCategory(authenticate(token), input)
  );

  ipc.handle(
    "categories:update",
    async (_evt, token: string, id: number, input: Partial<CategoryInput>) =>
      categories.updateCategory(authenticate(token), id, input)
  );

  ipc.handle("categories:countEbooks", async (_evt, token: string, id: number) =>
    categories.countCategoryEbooks(authenticate(token), id)
  );

  ipc.handle("categories:remove", async (_evt, token: string, id: number) =>
    categories.removeCategory(authenticate(token), id)
  );

  ipc.handle(
    "categories:reorder",
    async (_evt, token: string, orderedIds: number[]) =>
      categories.reorderCategories(authenticate(token), orderedIds)
  );
}
