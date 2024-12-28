declare global {
  interface String {
    stripText(): string;
    clearNewLines(): string;
  }
}

String.prototype.stripText = function stripText(): string {
  return this.split(" ")
    .filter((a) => a.length)
    .join(" ");
};

String.prototype.clearNewLines = function clearNewLines(): string {
  return this.split("\n")
    .filter((a) => a.length)
    .join(" ");
};

export namespace Shared {}
