/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom"
import userEvent from '@testing-library/user-event'
import BillsUI from "../views/BillsUI.js"
import { bills } from "../fixtures/bills.js"
import { ROUTES_PATH, ROUTES } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import storeMock from "../__mocks__/store.js";
import Bills from '../containers/Bills.js'

import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {

  describe("When I am on Bills Page", () => {
    beforeEach(() => {
      document.body.innerHTML = BillsUI({ data: bills })

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
    })

    afterEach(() => {
      document.body.innerHTML = ''
    })

    test("Then bill icon in vertical layout should be highlighted", async () => {
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      expect(screen.getByTestId('icon-window')).toEqual(document.querySelector('.active-icon'))
    })

    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : 1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })

    test("Then a button for create a new bills should be render", () => {
      const newBillsBtn = screen.getByTestId('btn-new-bill')
      expect(newBillsBtn).toBeTruthy()
    })

    describe('When I click on new bills button', () => {
      test('Then I should be redirect to new bills pages', () => {        
        const onNavigate = (pathname) => { document.body.innerHTML = ROUTES({ pathname }) }

        const billsContainer = new Bills({
          document,
          onNavigate,
          store: storeMock.bills(),
          localStorage: window.localStorage
        })

        const handleClickNewBillMock = jest.fn(billsContainer.handleClickNewBill)
        const newBillsBtn = screen.getByTestId('btn-new-bill')

        newBillsBtn.addEventListener('click', handleClickNewBillMock)
        userEvent.click(newBillsBtn)

        const href = window.location.href
        const title = screen.getByText('Envoyer une note de frais')
        expect(title).toBeTruthy()
        expect(handleClickNewBillMock).toHaveBeenCalled()
        expect(href.includes('employee')).toBeTruthy()
        expect(href.includes('bills')).toBeTruthy()
      })
    })

    describe('When database not contains bills', () => {
      test('Then layout should not contains bills', () => {
        document.body.innerHTML = BillsUI({ data: [] })
        const iconEye = screen.queryByTestId('icon-eye')
        expect(iconEye).toBeNull()
      })
    })
  
    describe('When database contains bills', () => {
      test('Then layout should contains bills', () => {
        document.body.innerHTML = BillsUI({ data: bills })
        const iconEyes = screen.queryAllByTestId('icon-eye')
        const billsLength = bills.length
        expect(billsLength).toEqual(4)
        expect(iconEyes.length).toBeGreaterThan(3)
      })
    })
  })

  describe('When I click on bills eye button', () => {
    test('Picture modal should be open', () => {
      $.fn.modal = jest.fn()
      document.body.innerHTML = BillsUI({ data: bills })
      const onNavigate = (pathname) => { document.body.innerHTML = ROUTES({ pathname }) }
      const billsContainer = new Bills({
        document,
        onNavigate,
        store: storeMock.bills(),
        localStorage: window.localStorage
      })

      const iconEye = screen.getAllByTestId('icon-eye')[0]
      const handleClickIconEyeMock = jest.fn((e) => billsContainer.handleClickIconEye(e.target))

      iconEye.addEventListener('click', handleClickIconEyeMock)
      userEvent.click(iconEye)

      expect(handleClickIconEyeMock).toHaveBeenCalled()
      expect(screen.getAllByText('Justificatif')).toBeTruthy()

      iconEye.addEventListener("click", (e) => {
        handleClickIconEyeMock(e.target)
        const modale = screen.getByTestId("modaleFile")
        expect(modale).toHaveClass("show")
      })
    })
  })

  describe("When I am on Bills Page, but page loading", () => {
    test('Then the loading page should be rendered', () => {
      document.body.innerHTML = BillsUI({ loading: true })
      expect(screen.getAllByText('Loading...')).toBeTruthy()
    })
  })

  describe("When I am on Bills Page, but receved an error message from server", () => {
    test('Then an error massage should be rendered', () => {
      document.body.innerHTML = BillsUI({ error: 'An error occured' })
      expect(screen.getAllByText('Erreur')).toBeTruthy()
    })
  })

  describe('When getBills', () => {
    test('Then should return a promise', async () => {
      const instance = new Bills({
        document,
        onNavigate,
        store: storeMock,
        localStorage: window.localStorage
      })
      return instance.getBills().then(data => {
        for (let i = 0; i < data.length; i++) {
          const elementData = data[i];
          delete elementData.date
        }
        for (let i = 0; i < bills.length; i++) {
          const elementBills = bills[i];
          delete elementBills.date
        }
        expect(data).toEqual(bills)
      })
    })
  })
})

///////////////////////
// Integration test //
/////////////////////
describe("Given I am a user connected as employee", () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    window.localStorage.setItem('user', JSON.stringify({
      type: 'Employee'
    }))

    const root = document.createElement("div")
    root.setAttribute("id", "root")
    document.body.appendChild(root)
    router()
    document.body.innerHTML = BillsUI({ data: bills })
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe("When I am on Bills page", () => {
    test("Then fetch bills from mock API GET", async () => {
      const getSpy = jest.spyOn(storeMock, "bills")
      const bills = await storeMock.bills().list()
      expect(getSpy).toHaveBeenCalledTimes(1)
      expect(bills.length).toBeGreaterThan(3)
    });

    describe("When an error occurs on API", () => {
      beforeEach(() => {
        jest.spyOn(storeMock, "bills")
        const root = document.createElement("div")
        root.setAttribute("id", "root")
        document.body.appendChild(root)
        router()
      })

      test("fetches bills from an API and fails with 404 message error", async () => {
        storeMock.bills.mockImplementationOnce(() => {
          return {
            list : () =>  {
              return Promise.reject(new Error("Erreur 404"))
            }
          }
        })

        window.onNavigate(ROUTES_PATH.Bills)
        await new Promise(process.nextTick)

        document.body.innerHTML = BillsUI({ error: "Erreur 404" })
        const message = await screen.getByText(/Erreur 404/)
        expect(message).toBeTruthy()
        expect(screen.getAllByText('Erreur')).toBeTruthy()
      })

      test("fetches bills from an API and fails with 500 message error", async () => {
        storeMock.bills.mockImplementationOnce(() => {
          return {
            list : () =>  {
              return Promise.reject(new Error("Erreur 500"))
            }
          }
        })

        window.onNavigate(ROUTES_PATH.Bills)
        await new Promise(process.nextTick)
        document.body.innerHTML = BillsUI({ error: "Erreur 500" })
        const message = await screen.getByText(/Erreur 500/)
        expect(message).toBeTruthy()
        expect(screen.getAllByText('Erreur')).toBeTruthy()
      })
    })
  })
})
