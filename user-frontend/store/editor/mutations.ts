import _ from "lodash";
import { MutationTypes } from "./mutation-type";
import { MutationTree } from "vuex";
import { EditorState } from "./index";

const mutations: MutationTree<EditorState> = {
  /**
   * @description to set loading
   * @param state
   * @param param1
   */
  [MutationTypes.SET_LOADING](state, { data }: { data: boolean }) {
    state.loading = data;
  },
  /**
   * @description to set the selected editor
   * @param state
   * @param param1
   */
  [MutationTypes.SET_EDITOR](state, { data }: { data: any }) {
    state.editor = data;
  },
  /**
   * @description to set editors
   * @param state
   * @param param1
   */
  [MutationTypes.SET_EDITORS](state, { data }: { data: any[] }) {
    state.editors = data;
  },
};

export default mutations;
