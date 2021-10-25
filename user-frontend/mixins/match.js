import _ from "lodash";
import { mapActions, mapGetters, mapMutations } from "vuex";

export default {
  computed: {
    ...mapGetters({
      loading: "match/loading",
      open_matching_dialog: "match/open_matching_dialog",
      match: "match/match",
      matches: "match/matches",
      matches_pagination: "match/matches_pagination",
      chat_messages: "match/chat_messages",
      codes: "match/codes",
    }),
  },

  methods: {
    ...mapActions({
      GET_MATCHES: "match/GET_MATCHES",
      GET_MATCH: "match/GET_MATCH",
      CREATE_MATCH: "match/CREATE_MATCH",
      END_MATCH: "match/END_MATCH",
      UPDATE_CODES: "match/UPDATE_CODES",
    }),

    ...mapMutations({
      SET_LOADING: "match/SET_LOADING",
      SET_OPEN_MATCHING_DIALOG: "match/SET_OPEN_MATCHING_DIALOG",
      SET_OPEN_ELO_MATCH_DIALOG: "match/SET_OPEN_ELO_MATCH_DIALOG",
      SET_MATCH: "match/SET_MATCH",
      UPDATE_CHAT_MESSAGES: "match/UPDATE_CHAT_MESSAGES",
    }),
  },
};
