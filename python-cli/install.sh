python setup.py build
@REM python setup.py install
pip install .

pip install wheel twine  
python setup.py sdist bdist_wheel
twine upload dist/* 
