import express from "express";
import makeExpressCallback from "../../express-callback";
import makeValidator from "../../middlewares/validator-middleware";

import { deleteEditorRules, getEditorRules } from "../../controllers/editor/validators";
import { deleteEditorController, getEditorController, hardDeleteEditorController } from "../../controllers/editor";

const editorRouter = express.Router();

editorRouter.get("/:editor_id", makeValidator(getEditorRules), makeExpressCallback(getEditorController));
editorRouter.delete("/:editor_id", makeValidator(deleteEditorRules), makeExpressCallback(deleteEditorController));
editorRouter.delete(
  "/hard-delete/:editor_id",
  makeValidator(deleteEditorRules),
  makeExpressCallback(hardDeleteEditorController),
);

export default editorRouter;
