# Builds the motion maps for animated covers. Run it through `just motion-map`.
FROM python:3.13.16-slim-trixie@sha256:cf50a4f6ac4f026458b08d5222023d700ac806410dff5e9ca8728fa44f2b850f
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt
COPY motion_map.py /usr/local/bin/motion_map.py
WORKDIR /site
ENTRYPOINT ["python", "-I", "/usr/local/bin/motion_map.py"]
