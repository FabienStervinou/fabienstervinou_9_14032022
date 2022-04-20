/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom/extend-expect";
import { screen, waitFor, fireEvent } from "@testing-library/dom"
import NewBill from '../containers/NewBill.js'
import { localStorageMock } from "../__mocks__/localStorage.js"
import mockStore from "../__mocks__/store"
import store from '../app/Store.js'

import { ROUTES_PATH, ROUTES } from "../constants/routes.js"
import router from "../app/Router.js"

jest.mock("../app/Store.js", () => mockStore)

beforeEach(() => {
  const root = document.createElement("div")
  root.setAttribute("id", "root")
  document.body.append(root)
  Object.defineProperty(window, 'localStorage', { value: localStorageMock })
  window.localStorage.setItem('user', JSON.stringify({
    type: 'Employee',
    email: 'employee@test.tld'
  }))
  router()
})

afterEach(() => {
  document.body.innerHTML = ''
  window.localStorage.clear()
})

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then newBill icon in vertical layout should be highlighted", async () => {
      window.onNavigate(ROUTES_PATH.NewBill)
      await waitFor(() => screen.getByTestId('icon-mail'))
      expect(screen.getByTestId('icon-mail')).toEqual(document.querySelector('.active-icon'))
    })

    describe('When I click on input type file and add a file', () => {
      test('Then handleChangeFile function should run and redirection on bills page', () => {
        jest.spyOn(mockStore, "bills")
        window.onNavigate(ROUTES_PATH.NewBill)
        mockStore.bills.mockImplementationOnce(() => {
          return {
            create: () => {
              return Promise.resolve({
                  fileUrl: 'test.jpg',
                  key: 1
                }
              )
            }
          }
        })

        const instanceNewBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage
        })

        const handleChangeFileMock = jest.fn(() => instanceNewBill.handleChangeFile)
        const inputFile = screen.getByTestId('file')
        const submitButton = document.querySelector('#btn-send-bill')
        inputFile.addEventListener('change', handleChangeFileMock)
        fireEvent.change(inputFile, {
          target: {
            files: [new File(["test.jpg"], "test.jpg", { type: "image/jpg" })],
          }
        })

        submitButton.click()

        expect(handleChangeFileMock).toHaveBeenCalled()
        expect(inputFile.files[0].name).toBe("test.jpg")

        const href = window.location.href
        expect(href.includes('employee')).toBeTruthy()
        expect(href.includes('bills')).toBeTruthy()
        jest.fn().mockClear()
        mockStore.bills.mockClear()
      })
    })

    describe('When I click on input type file and add a bad file type', () => {
      test('Then an error message should be rendered', () => {
        window.onNavigate(ROUTES_PATH.NewBill)
        const instanceNewBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage
        })
        const handleChangeFileMock = jest.fn(instanceNewBill.handleChangeFile)
        const inputFile = screen.queryByTestId('file')
        const submitButton = document.querySelector('#btn-send-bill')

        inputFile.addEventListener('change', handleChangeFileMock)
        fireEvent.change(inputFile, {
          target: {
            files: [new File(["test.svg"], "test.svg", { type: "image/svg+xml" })],
          }
        })
        fireEvent.click(submitButton)

        expect(inputFile.checkValidity()).toBeFalsy()
        expect(inputFile.validationMessage).toEqual('Le format du fichier doit être "jpeg", "jpg" ou "png"')
        jest.fn().mockClear()
      })
    })

    describe('When I submit form handleSubmit function should run', () => {
      test('Then handleSubmit function should been called', () => {
        window.onNavigate(ROUTES_PATH.NewBill)
        const onNavigate = (pathname) => { document.body.innerHTML = ROUTES({ pathname }) }
        const newBillInstance = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage
        })

        const updateSpy = jest.spyOn(newBillInstance, 'updateBill')
        screen.getByTestId('form-new-bill').submit()

        expect(updateSpy).toHaveBeenCalled()
        expect(newBillInstance.updateBill).toHaveBeenCalled()
        jest.fn().mockClear()
      })
    })
  })
})

// Test POST newBill store
describe('Given I am a user connected as employee', () => {
  describe('When I am on newBill page and submit form', () => {
    test('Then fetches newbills from mock API POST', async () => {
      window.onNavigate(ROUTES_PATH.NewBill)

      screen.getByTestId('expense-type').value = "Transport"
      screen.getByTestId('expense-name').value = "test"
      screen.getByTestId('amount').value = "123"
      screen.getByTestId('datepicker').value = "2022-01-01"
      screen.getByTestId('pct').value = 20
      screen.getByTestId('commentary').value = "Le commentaire"
      const inputFile = screen.getByTestId('file')
      fireEvent.change(inputFile, {
        target: {
          files: [new File(["test.jpeg"], "test.jpeg", { type: "image/jpeg" })],
        }
      })
      const submitButton = document.querySelector('#btn-send-bill')
      submitButton.click()

      await new Promise(process.nextTick)

      const href = window.location.href
      expect(href.includes('employee')).toBeTruthy()
      expect(href.includes('bills')).toBeTruthy()
      expect(screen.getByTestId('tbody').childElementCount).toBe(4)
    })

    test('Then fetch newbills from mock store create', async () => {
      const getSpy = jest.spyOn(store, "bills")
      const newbillsMockPost = {
        "fileUrl": "https://localhost:3456/images/test.jpg",
        "key": "1234"
      }
      const bills = await store.bills().create(newbillsMockPost)

      expect(getSpy).toHaveBeenCalled()
      expect(bills).toEqual(newbillsMockPost)
      jest.fn().mockClear()
    })
  })
})
