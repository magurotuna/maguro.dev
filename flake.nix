{
  description = "Development environment for maguro.dev";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            deno

            # npm is retained for package-lock.json maintenance and Netlify parity.
            nodejs_24

            # For Playwright tests (browser automation)
            # Uncomment if you need to run playwright tests locally
            # playwright-driver.browsers
          ];

          shellHook = ''
            echo "maguro.dev development environment"
            echo "Deno: $(deno --version | head -n 1)"
            echo ""
            echo "Run 'deno install' to install dependencies"
          '';
        };
      }
    );
}
