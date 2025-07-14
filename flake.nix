{
  description = "tbd";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
        let
        pkgs = import nixpkgs { system = system; config.allowUnfree = true; };
        in
        {
          devShells.default = pkgs.mkShell {
            packages = with pkgs; [
              python311
              terraform
              docker-compose
              awscli2
              nodejs_20
            ];
          };
        }
    );
}
