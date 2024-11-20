import unittest
from src.cli import main
from unittest.mock import patch
import sys

class TestCLI(unittest.TestCase):
    @patch('sys.argv', ['harmonyhub', 'version'])
    def test_version(self):
        with patch('builtins.print') as mocked_print:
            main()
            mocked_print.assert_called_with('HarmonyHub CLI version 0.1.0')

    @patch('sys.argv', ['harmonyhub', 'init'])
    def test_init(self):
        with patch('builtins.print') as mocked_print:
            main()
            mocked_print.assert_called_with('Initializing HarmonyHub...')

    @patch('sys.argv', ['harmonyhub', 'run'])
    def test_run(self):
        with patch('builtins.print') as mocked_print:
            main()
            mocked_print.assert_called_with('Running HarmonyHub...')
    
    @patch('sys.argv', ['harmonyhub', 'serve'])
    def test_run(self):
        with patch('builtins.print') as mocked_print:
            main()
            mocked_print.assert_called_with('Running on port 9087...')

    @patch('sys.argv', ['harmonyhub', 'help'])
    def test_help(self):
        with patch('argparse.ArgumentParser.print_help') as mocked_help:
            main()
            mocked_help.assert_called()

if __name__ == '__main__':
    unittest.main()