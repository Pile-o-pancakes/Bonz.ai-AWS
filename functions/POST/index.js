const { sendResponse, sendError } = require("../../responses/index");
const { db } = require("../../services/db");
const { nanoid } = require("nanoid");

const roomTypes = {
  1: {
    name: "Single",
    price: 500,
    maxGuests: 1,
  },
  2: {
    name: "Double",
    price: 1000,
    maxGuests: 2,
  },
  3: {
    name: "Suite",
    price: 1500,
    maxGuests: 3,
  },
}

async function checkIfRoomTypeIsBooked(checkInDate, checkOutDate, roomTypeId) {
  for (let i = 0; i < roomTypeId.length; i++) {
    const params = {
      TableName: 'Booking',
      FilterExpression:
        'contains(bookedRoomsId, :roomTypeId) AND ((checkInDate BETWEEN :checkInDate AND :checkOutDate) OR (checkOutDate BETWEEN :checkInDate AND :checkOutDate))',
      ExpressionAttributeValues: {
        ':checkInDate': checkInDate,
        ':checkOutDate': checkOutDate,
        ':roomTypeId': roomTypeId[i],
      },
    };

    const result = await db.scan(params).promise();
    if (result.Items.length > 0) return true;
  }
  return false;
};

function calculateNumberOfNights(checkInDate, checkOutDate) {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const timeDifference = Math.abs(checkOut - checkIn);
  return Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
}

async function bookRoom(
  guestName,
  numberOfGuests,
  bookedRoomsId,
  checkInDate,
  checkOutDate
) {
  const totalRooms = bookedRoomsId.length;
  let singleRoomCount = 0;
  let doubleRoomCount = 0;
  let suiteCount = 0;
  let bookedRoomsTotalPrice = 0;

  if (totalRooms > 20) {
    throw new Error("Exceeded the total number of rooms available.");
  }

  for (let i = 0; i < totalRooms; i++) {
    const roomTypeId = bookedRoomsId[i];
    const roomType = roomTypes[roomTypeId];

    if (!roomType) {
      throw new Error("Invalid room type");
    }

    if (roomType.name === "Single") {
      singleRoomCount++;
      bookedRoomsTotalPrice += roomType.price;
    } else if (roomType.name === "Double") {
      doubleRoomCount++;
      bookedRoomsTotalPrice += roomType.price;
    } else if (roomType.name === "Suite") {
      suiteCount++;
      bookedRoomsTotalPrice += roomType.price;
    }
  }

  if (
    singleRoomCount + doubleRoomCount * 2 + suiteCount * 3 !== numberOfGuests ||
    singleRoomCount > 20 ||
    doubleRoomCount > 10 ||
    suiteCount > 6
  ) {
    throw new Error("Invalid room selection for the number of guests.");
  }

  const numberOfNights = calculateNumberOfNights(checkInDate, checkOutDate);
  const totalAmount = bookedRoomsTotalPrice * numberOfNights;

  const newBooking = {
    id: nanoid(),
    guestName,
    numberOfGuests,
    bookedRoomsId,
    totalAmount,
    checkInDate,
    checkOutDate,
  };

  const orderToSend = {
    TableName: "Booking",
    Item: newBooking,
  };

  await db.put(orderToSend).promise();

  return newBooking;
}

exports.handler = async (event, context) => {
  try {
    const {
      guestName,
      numberOfGuests,
      bookedRoomsId,
      checkInDate,
      checkOutDate,
    } = JSON.parse(event.body);
    
    if (
      !guestName ||
      !numberOfGuests ||
      !bookedRoomsId ||
      !checkInDate ||
      !checkOutDate
    ) {
      return sendResponse(400, {
        success: false,
        message: "All required fields must be provided",
      });
    }

    const bookingExists = await checkIfRoomTypeIsBooked(
      checkInDate,
      checkOutDate,
      bookedRoomsId
    );
    if (bookingExists) {
      return sendResponse(400, {
        success: false,
        message: 'Room type is already booked for provided dates',
      });
    }

    const savedBooking = await bookRoom(
      guestName,
      numberOfGuests,
      bookedRoomsId,
      checkInDate,
      checkOutDate
    );

    return sendResponse(200, {
      success: true,
      booking: savedBooking,
    });
  } catch (error) {
    console.log(error);
    return sendResponse(500, {
      success: false,
      message: error.message || "Could not process booking",
    });
  }
};
