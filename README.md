# Garage Sale:

## Project Description:
it is an e-commerce, full-stack project. The user can sell or buy products using the app. 

## Project Motivation:
it was done as a second Capstone Project for my bootcamp to consolidate the knowledge of what we've learned. 

## Tech Specs:

- Node.js
- React
- JavaScript
- PostgreSQL
- AWS (S3 Bucket)

### Important libraries and frameworks:
- supertest: a test library for HTTP servers.
- bcrypt: It helps to encrypt the user's password before send it to the database.
- jsonwebtoken: It helps to share security information between two parties: a client and a server.
- jsonschema: It helps to do data format validations.
- create-react-app: help to build a react application.
- axios: help to do http requests.
- bootstrap: help to implement css in your project.
- fontawesome: help to get some icons for the project.

## AWS - S3 buckets:
to store all the photos from the app. 

## Usage 🚀

- create a folder where you would like to store garage-sale;
- inside this folder, create two others: frontend and backend;
- open your terminal and enter into the backend folder. Execute `git clone` for the repo `garage-sale-backend`;
- now, enter into the frontend folder and execute `git clone` for the repo `garage-sale-frontend`;
- for each one (backend and frontend) we will need to download dependencies, in order to run the app;
- from your terminal, go inside the backend folder;
- run `npm install`;
- to setup the database , make sure you do have PostgreSQL installed. If you are new to PostgreSQL, please click [here]("https://www.postgresql.org/");
- from your terminal, inside the backend directory, run `psql < jobly.sql`. It will create your database and also populate it with an initial set of data.
- now, let's setup the frontend. From your terminal, go inside the frontend folder;
- run npm install;
- at this moment, everything is installed. So, let's initiate garage_sale;
- from the frontend folder, run `npm start`;
- from the backend folder, run `npm start`;
- the URL you will need to access is: http://localhost:5000/ ;
- for informational purposes, the URL for backend is: http://localhost:3001/ ; 

## Project Functionalities

- the project is divided in 5 aspects: Users, Address, Products, Cart and Orders;
- the user can have more than one address. But only one will be consider the *default address*. This is important when you are selling a product, as the *default address* will be the pickup address for all your products;
- the user can't add a product to sell without an *default address* already saved;
- every user can buy or sell products;
- all the sales and purchases are visible at the *Orders* tab. There the user can see the address for pickup and more details about the transaction;


## Improvements

- Better organize the folders inside the project;
- Create tests;
- Break react components into smaller components;
- Improve the error messages, as they can be more user friendly;
- Implement the alert messages components to all error messages;
- Using [Stripe] ("https://stripe.com/") in the *test mode* to simulate payments with credit cards;
- Create a message feature to allow user's to communicate;
- Create a component for “Is Loading” and for “404 page”;
- Implement product search by city. 
