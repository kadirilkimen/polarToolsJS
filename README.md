# polarToolsJS
An online tool for g-code converting. It can convert g-code into the Polar Bear CNC compatible  coordinates.

Demo : https://kadirilkimen.com/thepolarbear/polartools/

Running with Docker
--------------------

The easiest way to get started.Already has nginx, php, php-fpm, etc. pre-configured::

   docker built -t polartoolsjs:v1 .
   docker run -d \ 
              -p 8080:80 \
              --name="polartoolsjs" polartoolsjs:v1

Go to http://localhost:8080 on the Docker host et voilà!
