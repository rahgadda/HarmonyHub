from setuptools import setup, find_packages

setup(
    name='harmonyhub-cli',
    version='0.0.1',
    packages=find_packages(),
    install_requires=[
        'jq==1.8.0',
        'PyYAML==6.0.2',
        'jinja2==3.1.4',
        'fastapi==0.115.5',
        'uvicorn==0.22.0'
    ],
    entry_points={
        'console_scripts': [
            'harmonyhub-cli=src.cli:main',
        ],
    },
    url='https://github.com/rahgadda/HarmonyHub',
    author='Rahul Kiran Gaddam',
    author_email='gaddam.rahul@gmail.com',
    description='A CLI library for HarmonyHub',
    long_description=open('README.md').read(),
    long_description_content_type='text/markdown',
    classifiers=[
        'Programming Language :: Python :: 3',
        'License :: OSI Approved :: MIT License',
        'Operating System :: OS Independent',
    ],
    python_requires='>=3.6'
)
