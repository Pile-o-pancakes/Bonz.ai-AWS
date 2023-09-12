const { sendResponse, sendError } = require("../../responses/index");
const { db } = require("../../services/db");
const { nanoid } = require("nanoid");

function calculateNumberOfNights(checkInDate, checkOutDate) {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const timeDifference = Math.abs(checkOut - checkIn);
  return Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
}

async function bookRoom(
  guestName,
  numberOfGuests,
  roomType,
  checkInDate,
  checkOutDate
) {
  let costPerNight;

  if (roomType === "single") {
    if (numberOfGuests !== 1)
      throw new Error("Invalid number of guests for single room");
    costPerNight = 500;
  } else if (roomType === "double") {
    if (numberOfGuests !== 2)
      throw new Error("Invalid number of guests for double room");
    costPerNight = 1000;
  } else if (roomType === "suite") {
    if (numberOfGuests !== 3)
      throw new Error("Invalid number of guests for suite");
    costPerNight = 1500;
  } else {
    throw new Error("Invalid room type");
  }

  const numberOfNights = calculateNumberOfNights(checkInDate, checkOutDate);
  const totalAmount = costPerNight * numberOfNights;

  const newBooking = {
    id: nanoid(),
    guestName,
    numberOfGuests,
    roomType,
    totalAmount,
    checkInDate,
    checkOutDate,
  };

  const params = {
    TableName: "Booking",
    Item: newBooking,
  };

  await db.put(params).promise();

  return newBooking;
}

exports.handler = async (event, context) => {
  try {
    const requestBody = JSON.parse(event.body);

    if (
      !requestBody.guestName ||
      !requestBody.numberOfGuests ||
      !requestBody.roomType ||
      !requestBody.checkInDate ||
      !requestBody.checkOutDate
    ) {
      return sendResponse(400, {
        success: false,
        message: "All required fields must be provided",
      });
    }

    const savedBooking = await bookRoom(
      requestBody.guestName,
      requestBody.numberOfGuests,
      requestBody.roomType,
      requestBody.checkInDate,
      requestBody.checkOutDate
    );

    return sendResponse(200, { success: true, booking: savedBooking });
  } catch (error) {
    console.log(error);
    return sendResponse(500, {
      success: false,
      message: error.message || "Could not process booking",
    });
  }
};
