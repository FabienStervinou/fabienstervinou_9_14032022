import $ from 'jquery';
require('@testing-library/jest-dom')

global.$ = global.jQuery = $;
global.fetch = require('jest-fetch-mock')
