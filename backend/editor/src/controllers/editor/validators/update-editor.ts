const updateEditorRules = {
  _id: ["required", "regex:/^[0-9a-fA-F]{24}$/i"],
  content: "string",
};

export default updateEditorRules;
