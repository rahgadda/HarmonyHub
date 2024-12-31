python setup.py build
pip install .

pip install wheel twine  
python setup.py sdist bdist_wheel
twine upload dist/* 