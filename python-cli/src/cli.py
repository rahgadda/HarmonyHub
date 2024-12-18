import argparse
from src.commands.init import init
from src.commands.run import run_workflow
from src.commands.serve import serve

def main():
    parser = argparse.ArgumentParser(description='HarmonyHub CLI')
    subparsers = parser.add_subparsers(dest='command')

    # Version
    parser.add_argument('--version', action='version', version='%(prog)s 0.0.1')

    # Init Command
    init_parser = subparsers.add_parser('init', help='Initialize a basic workflow YAML file')   
    init_parser.add_argument('--file', type=str, default="output.yaml", help='Path to the new workflow YAML file')

    # Run Command
    run_parser = subparsers.add_parser('run', help='Run the workflow from a YAML file')
    run_parser.add_argument('file', type=str, help='Path to the workflow YAML file')
    run_parser.add_argument('--debug', action='store_true', help='Enable debug mode for detailed output')

    # Serve Command
    serve_parser = subparsers.add_parser('serve', help='Run a local http server on port 9087(default)')
    serve_parser.add_argument('--port', type=int, default=9087, help='Http server port')
    serve_parser.add_argument('--debug', action='store_true', help='Enable debug mode for detailed output')

    args = parser.parse_args()

    if args.command == 'init':
        init(args.file)
    elif args.command == 'run':
        print(f"run {args.file}")
        run_workflow(args.file, args.debug)
    elif args.command == 'serve':
        serve(args.port, args.debug)
    elif args.command == 'help':
        parser.print_help()

if __name__ == '__main__':
    main()