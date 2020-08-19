import React from 'react';
import { connect } from 'dva';
import CryptoJS from 'crypto-js';

@connect(({}) => ({}))
export default class Spec extends React.Component {
  componentDidMount() {
    this.props.dispatch({ type: 'specModel/handleSpec' });

    const dateString = new Date().toUTCString();
    let username = 'alice123';
    let secret = 'secret';
    let algorithmForKong = 'hmac-sha256';
    let message = 'x-date: ' + dateString;
    let signature = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(message, secret));
    let authHeader =
      'hmac username="' +
      username +
      '", algorithm="' +
      algorithmForKong +
      '", headers="x-date", signature="' +
      signature +
      '"';

    fetch(
      'http://47.115.8.86:8000/api/keyauthtest?key=SD_-K6P83opRTQhOq&location=beijing&language=zh-Hans&unit=c',
      {
        headers: {
          'x-date': dateString,
          authorization: authHeader,
        },
      },
    )
      .then((response) => response.json())
      .then((data) => console.log('data--', data));

    fetch('http://47.115.8.86:8001/swagger_gens/keyauth-service')
      .then((response) => response.json())
      .then((data) => this.setState({ oas_json: data.oas_json }));

    fetch('http://47.115.8.86:8001/swagger_gens/keyauth-service_check')
      .then((response) => response.json())
      .then((data) => this.setState({ oas_check_json: data.oas_json }));
  }

  render() {
    return <div>JSON转化</div>;
  }
}
