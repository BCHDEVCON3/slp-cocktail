DEMO:

[![SLP Demo](https://user-images.githubusercontent.com/11996139/92336326-0f4b8180-f0a8-11ea-99e3-b3e31fdcf997.png)](https://youtu.be/iw079Qw_I1w)

Example of the valid transaction with SLPCocktail: https://explorer.bitcoin.com/tbch/tx/47a6c04f2eddf70475032ac13245fb44f3a950c44086d74d6771a8a616e41c01

This project goal is to create the platform for the decentralized Coinjoins for SLP tokens.

How it works:

1. The user configures the amount of tokens, receiver and privacy level (peers count) and press “Shake it”.

2. The peers are matched via webrtc based on user preferences.

3. All matched peers form the transaction.

4. Every user signs own inputs.

5. Signed transaction is broadcasted to network.

### Current Limitations:

- This project uses a free plan of the https://fullstack.cash/. At this moment, if you are trying to create a transaction for many accounts or for accounts that have a lot of UTXO - you will get an rate-limit error.
- Also, our project uses public webrtc signal servers. If you can't find peers for a long time, try pressing "Cancel" and "Shake it" again. This should help.

If you try to build transaction for a large number of accounts or for accounts with verious amount of 

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `yarn test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
