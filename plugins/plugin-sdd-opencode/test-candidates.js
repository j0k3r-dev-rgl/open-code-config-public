import { resolveProjectCandidates } from "./src/config.js";

const api = {
    state: {
        path: {
            directory: "/home/j0k3r/.config/opencode/plugins/plugin-sdd-opencode"
        }
    }
};

console.log(resolveProjectCandidates(api));
