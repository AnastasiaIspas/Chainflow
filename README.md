# Sample Hardhat 3 Beta Project (`mocha` and `ethers`)

This project showcases a Hardhat 3 Beta project using `mocha` for tests and the `ethers` library for Ethereum interactions.

To learn more about the Hardhat 3 Beta, please visit the [Getting Started guide](https://hardhat.org/docs/getting-started#getting-started-with-hardhat-3). To share your feedback, join our [Hardhat 3 Beta](https://hardhat.org/hardhat3-beta-telegram-group) Telegram group or [open an issue](https://github.com/NomicFoundation/hardhat/issues/new) in our GitHub issue tracker.

## Project Overview

This example project includes:

- A simple Hardhat configuration file.
- Foundry-compatible Solidity unit tests.
- TypeScript integration tests using `mocha` and ethers.js
- Examples demonstrating how to connect to different types of networks, including locally simulating OP mainnet.

## Usage

### Running Tests

To run all the tests in the project, execute the following command:

```shell
npx hardhat test
```

You can also selectively run the Solidity or `mocha` tests:

```shell
npx hardhat test solidity
npx hardhat test mocha
```

### Make a deployment to Sepolia

This project includes an example Ignition module to deploy the contract. You can deploy this module to a locally simulated chain or to Sepolia.

To run the deployment to a local chain:

```shell
npx hardhat ignition deploy ignition/modules/Counter.ts
```

To run the deployment to Sepolia, you need an account with funds to send the transaction. The provided Hardhat configuration includes a Configuration Variable called `SEPOLIA_PRIVATE_KEY`, which you can use to set the private key of the account you want to use.

You can set the `SEPOLIA_PRIVATE_KEY` variable using the `hardhat-keystore` plugin or by setting it as an environment variable.

To set the `SEPOLIA_PRIVATE_KEY` config variable using `hardhat-keystore`:

```shell
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

After setting the variable, you can run the deployment with the Sepolia network:

```shell
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts
```


Pentru implementarea de frontend:
Pasi:
1. pornire blockchain local : npx hardhat node
2. in alt terminal, deploy la contracte:   npx hardhat run scripts/deploy.ts --network localhost
3. in alt terminal, pornire frontend: cd frontend + alta comanda: npm run dev
4. deschide aplicatia in browser: http://localhost:5173
5. deschide metamask si selecteaza reteaua hardhat local (default url: 127.0.0.1:8545, chainId: 31337, currency: ETH)
6. importa un cont in metamask folosind private key-ul account 0 afisat in terminalul cu hardhat (apasam sus pe account, buton add wallet, buton import an  account, paste private key)
7. in browser, apasa connect metamask si confirma conexiunea (daca nu se deschide automat fereastra de metamask, apasam pe extensia de metamask si o sa apare un buton pentru confirmare)
8. dupa conectare, aplicatia e gata de testare cu creere de plan/subscribe/pay etc

Cum s a facut conexiunea cu metamask? 
In fisieru App.jsx in functia connectWallet exista un:
if (!window.ethereum) {
  alert("Instalează MetaMask.");
  return;
} care verifica daca extensia exista in browser, si daca nu arunca alerta. 

Tot in functia connectWallet, frontend-ul cere permisiunea Metamask-ului  
await window.ethereum.request({
  method: "eth_requestAccounts"
});
Asta trimite o cerere metamaskului, metamask deschide popup, userul apasa confirm, metamask returneaza adresa wallet-ului.

Iar aici frontend-ul se leaga de MetaMask:
const provider = new ethers.BrowserProvider(window.ethereum);
BrowserProvider=adaptor intre frontend si Metamask
ii spunem lui ethers "foloseste metamask ca provider de blockchain"

Aici se ia adresa wallet-ului:
const signer = await provider.getSigner();
const address = await signer.getAddress();
signer=wallet-ul selectat in MetaMask (poate semna trazanactii, poate trimite ETH)

Aici se salveaza conexiunea in UI:
setSigner(signer);
setUserAddress(address);
=salveaza wallet-ul in react, UI-ul stie acum cine e conectat, de aici se activeaza butoanele


De ce merg butoanele de Create Plan/Subcribe doar dupa conexiunea cu MetaMask?
new ethers.Contract(address, abi, signer)
FARA signer poti doar citi, nu poti trimite tranzactii.
Dupa connect: signer exista, MetaMask poate semna tranzactii, apare popul de Metamask la Subcribe/Pay etc.



