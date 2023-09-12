const { t } = require('tar');
const { sendResponse, sendError } = require('../../responses/index');
const { db } = require('../../services/db');
const { nanoid } = require('nanoid');

exports.handler = async (event, context) => {
  const { name, total_price, totalRooms } = JSON.parse(event.body);
  roomType = [
    {
      id: 1,
      name: 'Single',
      price: 500,
      booked: false,
      maxGuests: 1,
    },
    {
      id: 2,
      name: 'Double',
      price: 1000,
      booked: false,
      maxGuests: 2,
    },
    {
      id: 3,
      name: 'Suite',
      price: 1500,
      booked: false,
      maxGuests: 3,
    },
  ];

  try {
    const id = nanoid();
    const order = {
      id,
      guestName,
      numberOfGuests,
      totalCost,
      fromDate,
      toDate,
      bookedRoomsId,
    };

    // await db
    //   .put({
    //     TableName: process.env.TABLE_NAME,
    //     Item: {
    //       id,
    //     },
    //   })
    //   .promise();

    return sendResponse(200, { success: true, order });
  } catch (err) {
    console.log('Error', err);
    return sendError(500, {
      success: false,
      message: 'Could not create order',
    });
  }
};
