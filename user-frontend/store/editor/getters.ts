import _ from "lodash";
import { GetterTree } from "vuex";
import { EditorState } from "./index";
import { RootState } from "../index";

export const getters: GetterTree<EditorState, RootState> = {
  editor: (state) => state.editor,
  editors: (state) => state.editors,
  loading: (state) => state.loading,
};

export default getters;