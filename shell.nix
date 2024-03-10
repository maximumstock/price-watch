let
  pkgs = import <nixpkgs> {};
in
pkgs.mkShell rec {
  buildInputs = with pkgs; [
    python311
    terraform
    docker-compose
    awscli2
    nodejs_18
  ];
}
