//#region src/index.d.ts
/**
 * Node half of the plugin. A `dsh.client` row is mounted on the host too, so
 * this entry must exist and be inert: the whole feature lives in the browser
 * export, which the host composes from `exports["./client"]`.
 */
/** Host plugin body: this plugin contributes nothing to the host tree. */
declare function apply(): void;
//#endregion
export { apply };