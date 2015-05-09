#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
import os
import webapp2
import jinja2


TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), 'templates')
JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(TEMPLATE_DIR),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)


class RequestHandler(webapp2.RedirectHandler):

    def write(self, *args, **kwargs):
        self.response.out.write(*args, **kwargs)

    def render_template(self, template, **kwargs):
        t = JINJA_ENVIRONMENT.get_template(template)
        self.write(t.render(kwargs))


class MainHandler(RequestHandler):
    def get(self):
        self.render_template('index.html')


app = webapp2.WSGIApplication([
    ('/', MainHandler)
], debug=True)
