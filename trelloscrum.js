/*
** TrelloScrum v0.56 - https://github.com/Q42/TrelloScrum
** Adds Scrum to your Trello
**
** Original:
** Jasper Kaizer <https://github.com/jkaizer>
** Marcel Duin <https://github.com/marcelduin>
**
** Contribs:
** Paul Lofte <https://github.com/paullofte>
** Nic Pottier <https://github.com/nicpottier>
** Bastiaan Terhorst <https://github.com/bastiaanterhorst>
** Morgan Craft <https://github.com/mgan59>
** Frank Geerlings <https://github.com/frankgeerlings>
**
*/

/*global jQuery, $, chrome, BlobBuilder */

//default story point picker sequence
var pointSeq = ['?', 0, 1, 2, 3, 5, 8, 13, 20],
    filtered = false, //watch for filtered cards
	reg = /\((\x3f|\d*\.?\d+)\)\s?/m, //parse regexp- accepts digits, decimals and '?'
	valueReg = /\(((V?[A-Z])|(V(\x3f|\d*\.?\d+)))\)\s?/im, // parse value regexp- a value of H, M or L or V followed by digits, decimals
	iconUrl = chrome.extension.getURL('images/storypoints-icon.png'),
	valueIconUrl = chrome.extension.getURL('images/value-icon.png'),
	blockIconUrl = chrome.extension.getURL('images/block-icon.png'),
    $excel_btn,
    $excel_dl;

window.URL = window.webkitURL || window.URL;
window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;


$(function () {
    "use strict";

    function calcPoints($el) {
        ($el || $('.list')).each(function () {
            if (this.list) {
                this.list.calc();
            }
        });
    }

    function ListCard(el) {
        if (el.listCard) {
            return;
        }
        el.listCard = this;

        var points = -1,
            value = -1,
            block = -1,
            parsed,
            that = this,
            busy = false,
            busy2 = false,
            busy3 = false,
            busy4 = false,
            to,
            to2,
            to3,
            to4,
            $card,
            $badge,
            $valueBadge,
            $blockBadge;

        function getPoints() {
            var $title, title;

            $title = $card.find('a.list-card-title');
            if (!$title[0] || busy) {
                return;
            }
            busy = true;
            title = $title[0].text;
            parsed = title.match(reg);
            points = parsed ? parsed[1] : -1;
            if ($card.parent()[0]) {
                $title[0].textContent = title.replace(reg, '');
                $badge.text(that.points);
                $badge.attr({ title: 'This card has ' + that.points + ' storypoint' + (that.points === 1 ? '.' : 's.') });
            }
            busy = false;
        }

        function getValue() {
            var $title, title;

            $title = $card.find('a.list-card-title');
            if (!$title[0] || busy) {
                return;
            }

            busy = true;
            title = $title[0].text;
            parsed = title.match(valueReg);
            value = parsed ? parsed[1].replace(/V/gim, '') : -1;
            if ($card.parent()[0]) {
                $title[0].textContent = title.replace(valueReg, '');
                $valueBadge.text(that.value);
                $valueBadge.attr({ title: 'This card has a ' + that.value + ' value' });
            }
            busy = false;
        }

        function getBlock() {
            var $title, title, toLower, blockIndex;

            $title = $card.find('a.list-card-title');
            if (!$title[0] || busy) {
                return;
            }
            busy = true;
            title = $title[0].text;
            toLower = title.toLowerCase();
            blockIndex = (toLower.indexOf('(block)'));
            if (blockIndex !== -1) {
                if ($card.parent()[0]) {
                    $title[0].textContent = title.replace(title.substring(blockIndex, blockIndex + 7), '');
                    $blockBadge.text('BLOCK');
                    $blockBadge.attr({ title: 'This card is a block!' });
                }
            }
            busy = false;
        }

        $card = $(el)
            .bind('DOMNodeInserted', function (e) {
                if (!busy && ($(e.target).hasClass('list-card-title') || e.target === $card[0])) {
                    clearTimeout(to2);
                    to2 = setTimeout(function () {
                        getValue();
                        getPoints();
                        getBlock();
                    });
                }
            });
        $badge = $('<div class="badge badge-points point-count" style="background-image: url(' + iconUrl + ')"/>')
            .bind('DOMSubtreeModified DOMNodeRemovedFromDocument', function (e) {
                if (busy2) {
                    return;
                }
                busy2 = true;
                clearTimeout(to);
                to = setTimeout(function () {
                    $badge.prependTo($card.find('.badges'));
                    busy2 = false;
                });
            });
        $valueBadge = $('<div class="badge badge-points point-count badge-value" style="background-image: url(' + valueIconUrl + ')"/>')
			.bind('DOMSubtreeModified DOMNodeRemovedFromDocument', function (e) {
			    if (busy3) {
			        return;
			    }
			    busy3 = true;
			    clearTimeout(to3);
			    to3 = setTimeout(function () {
			        $valueBadge.prependTo($card.find('.badges'));
			        busy3 = false;
			    });
			});
        $blockBadge = $('<div class="badge badge-points point-count badge-block" style="'
			    + 'background-image: url(' + blockIconUrl + '); background-color: #AF0000 !important;border-color: #870000 !important;'
			    + '"/>')
			.bind('DOMSubtreeModified DOMNodeRemovedFromDocument', function (e) {
			    if (busy4) {
			        return;
			    }
			    busy4 = true;
			    clearTimeout(to4);
			    to4 = setTimeout(function () {
			        console.log($card);
			        $blockBadge.prependTo($card.find('.badges'));
			        busy4 = false;
			    });
			});

        this.__defineGetter__('points', function () {
            //don't add to total when filtered out
            return parsed && (!filtered || ($card.css('opacity') === 1 && $card.css('display') !== 'none')) ? points : '';
        });

        this.__defineGetter__('value', function () {
            //don't add to total when filtered out
            return parsed && (!filtered || ($card.css('opacity') === 1 && $card.css('display') !== 'none')) ? value : '';
        });

        this.__defineGetter__('block', function () {
            return (!filtered || ($card.css('opacity') === 1 && $card.css('display') !== 'none')) ? block : '';
        });

        getValue();
        getBlock();
        getPoints();
    }

    //.list pseudo
    function List(el) {
        if (el.list) {
            return;
        }

        el.list = this;

        var $list = $(el),
            to,
            to2,
            $total;


        function readCard($c) {
            $c.each(function () {
                if ($(this).hasClass('placeholder')) {
                    return;
                }
                if (!this.listCard) {
                    this.listCard = new ListCard(this);
                }
            });
        }

        $total = $('<span class="list-total">')
		.bind('DOMNodeRemovedFromDocument', function () {
		    clearTimeout(to);
		    to = setTimeout(function () {
		        $total.appendTo($list.find('.list-header h2'));
		    });
		})
		.appendTo($list.find('.list-header h2'));

        $list.bind('DOMNodeInserted', function (e) {
            if ($(e.target).hasClass('list-card') && !e.target.listCard) {
                clearTimeout(to2);
                to2 = setTimeout(readCard, 0, $(e.target));
            }
        });

        this.calc = function () {
            var score = 0, scoreTruncated;
            $list.find('.list-card').each(function () {
                if (this.listCard && !isNaN(Number(this.listCard.points))) {
                    score += Number(this.listCard.points);
                }
            });
            scoreTruncated = Math.floor(score * 100) / 100;
            $total.text(scoreTruncated > 0 ? scoreTruncated : '');
        };

        readCard($list.find('.list-card'));
    }

    function readList($c) {
        $c.each(function () {
            if (!this.list) {
                this.list = new List(this);
            }
            else if (this.list.calc) {
                this.list.calc();
            }
        });
    }

    function showExcelExport() {
        $excel_btn.text('Generating...');

        $.getJSON($('form').find('.js-export-json').attr('href'), function (data) {
            var s = '<table id="export" border=1>', bb, boardTitleReg, boardTitleParsed, boardTitle, evt;
            s += '<tr><th>Points</th><th>Story</th><th>Description</th></tr>';
            $.each(data.lists, function (key, list) {
                var listId = list.id;
                s += '<tr><th colspan="3">' + list.name + '</th></tr>';

                $.each(data.cards, function (key1, card) {
                    if (card.idList === listId) {
                        var title = card.name,
                            parsed = title.match(reg),
                            points = parsed ? parsed[1] : '';
                        title = title.replace(reg, '');
                        s += '<tr><td>' + points + '</td><td>' + title + '</td><td>' + card.desc + '</td></tr>';
                    }
                });
                s += '<tr><td colspan=3></td></tr>';
            });
            s += '</table>';

            bb = new BlobBuilder();
            bb.append(s);

            boardTitleReg = '/.*\/board\/(.*)\//';
            boardTitleParsed = document.location.href.match(boardTitleReg);
            boardTitle = boardTitleParsed[1];

            $excel_btn
			.text('Excel')
			.after(
				$excel_dl = $('<a>')
					.attr({
					    download: boardTitle + '.xls',
					    href: window.URL.createObjectURL(bb.getBlob('application/ms-excel'))
					})
			);

            evt = document.createEvent('MouseEvents');
            evt.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            $excel_dl[0].dispatchEvent(evt);
            $excel_dl.remove();

        });

        return false;
    }

    function checkExport() {
        if ($('form').find('.js-export-excel').length) {
            return;
        }
        var $jsBtn = $('form').find('.js-export-json');
        if ($jsBtn.length) {
            $excel_btn = $('<a>')
			.attr({
			    style: 'margin: 0 4px 4px 0;',
			    'class': 'button js-export-excel',
			    href: '#',
			    target: '_blank',
			    title: 'Open downloaded file with Excel'
			})
			.text('Excel')
			.click(showExcelExport)
			.insertAfter($jsBtn);
        }
    }

    //watch filtering
    $('.js-filter-toggle').on('mouseup', function (e) {
        setTimeout(function () {
            filtered = $('.js-filter-cards').hasClass('is-on');
            calcPoints();
        });
    });

    //for storypoint picker
    $(".card-detail-title .edit-controls").on('DOMNodeInserted', function (e) {
        var $this = $(this), $picker, i, point;

        if ($this.find('.picker').length) {
            return;
        }

        $picker = $('<div class="picker">').appendTo('.card-detail-title .edit-controls');
        
        function nodeOnClick(element) {
            var value = $(element).text(),
                    $text = $('.card-detail-title .edit textarea'),
                    text = $text.val();

            // replace our new
            $text[0].value = text.match(reg) ? text.replace(reg, '(' + value + ') ') : '(' + value + ') ' + text;

            // then click our button so it all gets saved away
            $(".card-detail-title .edit .js-save-edit").click();

            return false;
        }

        for (i in pointSeq) {
            if (pointSeq.hasOwnProperty(i)) {
                point = pointSeq[i];

                $picker.append($('<span class="point-value">').text(point).click(nodeOnClick(this)));
            }
        }

    });

    $('body').bind('DOMSubtreeModified', function (e) {
        if ($(e.target).hasClass('list')) {
            readList($(e.target));
        }
    });

    $('.js-share').on('mouseup', function () {
        setTimeout(checkExport);
    });

    readList($('.list'));

});