node-nyc-tax-scraper
====================

A node.js script to pull the NYC property tax bill for a given BBL and scrape data from it.

Based on earlier work done on this [NYC Property Tax Map](http://nyctaxmap.herokuapp.com/).
To make that map, the pdf download and scraping were done in [two separate workflows](https://github.com/chriswhong/taxMap/tree/master/scripts).

This version takes a BBL, downloads the latest pdf tax bill, saves it to a file, scrapes data from the file, and returns the data as an object.

Why?
====

I am planning a new iteration of the property tax explorer map using a more modern stack and server-side tile rendering with CartoDB. The new map will use postGIS to do aggregations of tax impact by various geometries (borough, neighborhood, arbitrary area).

